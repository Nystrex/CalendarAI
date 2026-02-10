import { createClient } from "@/lib/supabase/server"
import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { refreshAccessToken, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { NextResponse } from "next/server"

// Global sync lock to prevent concurrent syncs
let isSyncing = false
let lastSyncTime = 0
const MIN_SYNC_INTERVAL = 60000 // Minimum 1 minute between syncs

export async function POST(request: Request) {
  const now = Date.now()
  if (isSyncing) {
    return NextResponse.json({ message: "Sync already in progress", synced: 0, pushed: 0 })
  }

  if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
    return NextResponse.json({ message: "Please wait before syncing again", synced: 0, pushed: 0 })
  }

  isSyncing = true
  lastSyncTime = now

  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 })
    }

    const supabase = await createClient()
    
    // Get user without triggering session refresh to avoid cookie issues
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: connections, error: connError } = await supabase
      .from("oauth_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)

    if (connError || !connections || connections.length === 0) {
      return NextResponse.json({ error: "No Google account connected" }, { status: 400 })
    }

    const connection = connections[0]
    let accessToken = connection.access_token

    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at)

      if (expiresAt < new Date()) {
        try {
          const tokens = await refreshAccessToken(connection.refresh_token!)
          accessToken = tokens.access_token

          const newExpiresAt = new Date()
          newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in)

          await supabase
            .from("oauth_connections")
            .update({
              access_token: tokens.access_token,
              token_expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", connection.id)
        } catch (error) {
          return NextResponse.json(
            { error: "Token refresh failed. Please reconnect your Google account." },
            { status: 401 },
          )
        }
      }
    }

    const googleAPI = new GoogleCalendarAPI(accessToken)
    googleAPI.resetRateLimiter()

    const googleCalendars = await googleAPI.listCalendars()

    for (const gcal of googleCalendars) {
      if (gcal.accessRole === "owner" || gcal.accessRole === "writer") {
        try {
          const { data: existing } = await supabase
            .from("calendars")
            .select("id, is_visible")
            .eq("user_id", user.id)
            .eq("provider", "google")
            .eq("provider_calendar_id", gcal.id)
            .single()

          if (existing && existing.is_visible === false) {
            continue
          }

          const { error: calError } = await supabase.from("calendars").upsert(
            {
              user_id: user.id,
              name: gcal.summary,
              color: gcal.backgroundColor || "#3b82f6",
              provider: "google",
              provider_calendar_id: gcal.id,
              is_visible: existing ? existing.is_visible : true,
            },
            {
              onConflict: "user_id,provider,provider_calendar_id",
              ignoreDuplicates: false,
            },
          )

          if (calError) {
            if (calError.message.includes("constraint") || calError.message.includes("conflict")) {
              const { data: existingCalendar } = await supabase
                .from("calendars")
                .select("id")
                .eq("user_id", user.id)
                .eq("provider", "google")
                .eq("provider_calendar_id", gcal.id)
                .single()

              if (existingCalendar) {
                await supabase
                  .from("calendars")
                  .update({
                    name: gcal.summary,
                    color: gcal.backgroundColor || "#3b82f6",
                  })
                  .eq("id", existingCalendar.id)
              } else {
                await supabase.from("calendars").insert({
                  user_id: user.id,
                  name: gcal.summary,
                  color: gcal.backgroundColor || "#3b82f6",
                  provider: "google",
                  provider_calendar_id: gcal.id,
                  is_visible: true,
                })
              }
            }
          }
        } catch (error) {
          // Silently continue on calendar sync errors
        }
      }
    }

    const { data: ourCalendars } = await supabase
      .from("calendars")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_visible", true)

    if (!ourCalendars) {
      return NextResponse.json({ synced: 0, pushed: 0 })
    }

    // Local calendars will be pushed on next manual sync or when events are created

    let syncedCount = 0
    const pushedCount = 0
    let calendarsProcessed = 0
    const MAX_CALENDARS_PER_SYNC = 3 // Limit calendars processed per sync to avoid rate limits

    for (const calendar of ourCalendars.filter((c) => c.provider === "google" && c.provider_calendar_id)) {
      if (calendarsProcessed >= MAX_CALENDARS_PER_SYNC) {
        break
      }

      try {
        const timeMin = new Date()
        const timeMax = new Date()
        timeMax.setFullYear(timeMin.getFullYear() + 1)

        let googleEvents
        try {
          const result = await googleAPI.listEventsIncremental(
            calendar.provider_calendar_id!,
            undefined, // TODO: Store and retrieve sync tokens per calendar
            timeMin.toISOString(),
            timeMax.toISOString(),
          )
          googleEvents = result.items
        } catch (eventError: any) {
          if (eventError.message?.includes("404") || eventError.statusCode === 404) {
            await supabase.from("calendars").update({ is_visible: false }).eq("id", calendar.id)
            continue
          }
          if (eventError.message?.includes("Rate limit")) {
            continue
          }
          continue
        }

        calendarsProcessed++

        for (const gevent of googleEvents) {
          const startTime = gevent.start.dateTime || gevent.start.date
          const endTime = gevent.end.dateTime || gevent.end.date

          if (!startTime || !endTime) {
            continue
          }

          const { data: existingEvent } = await supabase
            .from("events")
            .select("id")
            .eq("provider_event_id", gevent.id)
            .eq("user_id", user.id)
            .maybeSingle()

          const eventData = {
            calendar_id: calendar.id,
            user_id: user.id,
            title: gevent.summary || "Untitled Event",
            description: gevent.description || null,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            all_day: !gevent.start.dateTime,
            location: gevent.location || null,
            provider: "google" as const,
            provider_event_id: gevent.id,
            reminder_minutes: gevent.reminders?.overrides?.[0]?.minutes || (gevent.reminders?.useDefault ? 15 : null),
          }

          try {
            if (existingEvent) {
              const { error: updateError } = await supabase.from("events").update(eventData).eq("id", existingEvent.id)

              if (updateError) {
                if (updateError.code === "23505") {
                  await supabase.from("events").delete().eq("id", existingEvent.id)
                  const { error: retryError } = await supabase.from("events").insert(eventData)
                  if (!retryError) {
                    syncedCount++
                  }
                }
              } else {
                syncedCount++
              }
            } else {
              const { error: insertError } = await supabase.from("events").insert(eventData)

              if (insertError) {
                if (insertError.code === "23505") {
                  const { data: conflictingEvent } = await supabase
                    .from("events")
                    .select("id")
                    .eq("provider_event_id", gevent.id)
                    .single()

                  if (conflictingEvent) {
                    const { error: updateError } = await supabase
                      .from("events")
                      .update(eventData)
                      .eq("id", conflictingEvent.id)

                    if (!updateError) {
                      syncedCount++
                    }
                  }
                }
              } else {
                syncedCount++
              }
            }
          } catch (error: any) {
            // Silently continue on event sync errors
          }
        }
      } catch (error) {
        continue
      }
    }

    return NextResponse.json({
      synced: syncedCount,
      pushed: pushedCount,
      calendarsProcessed,
      totalCalendars: ourCalendars.filter((c) => c.provider === "google").length,
    })
  } catch (error) {
    console.error("Google sync error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 })
  } finally {
    isSyncing = false
  }
}
