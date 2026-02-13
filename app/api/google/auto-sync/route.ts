import { createClient } from "@/lib/supabase/server"
import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { refreshAccessToken, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Google OAuth connection
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
          return NextResponse.json({ error: "Token refresh failed" }, { status: 401 })
        }
      }
    }

    const googleAPI = new GoogleCalendarAPI(accessToken)

    const googleCalendars = await googleAPI.listCalendars()
    let syncedCalendars = 0

    for (const gcal of googleCalendars) {
      // Sync all calendars (owner, writer, and reader)
      await supabase.from("calendars").upsert(
        {
          user_id: user.id,
          name: gcal.summary,
          color: gcal.backgroundColor || "#3b82f6",
          provider: "google",
          provider_calendar_id: gcal.id,
        },
        {
          onConflict: "user_id,provider,provider_calendar_id",
        },
      )
      syncedCalendars++
    }

    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 7)
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 180)

    // Get all Google calendars from database
    const { data: ourCalendars } = await supabase
      .from("calendars")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")

    if (!ourCalendars) {
      return NextResponse.json({ calendars: syncedCalendars, events: 0 })
    }

    let syncedCount = 0

    for (const calendar of ourCalendars) {
      if (!calendar.provider_calendar_id) continue

      try {
        const googleEvents = await googleAPI.listEvents(
          calendar.provider_calendar_id,
          timeMin.toISOString(),
          timeMax.toISOString(),
        )

        for (const gevent of googleEvents) {
          const startTime = gevent.start.dateTime || gevent.start.date
          const endTime = gevent.end.dateTime || gevent.end.date

          if (!startTime || !endTime) continue

          const eventData = {
            calendar_id: calendar.id,
            user_id: user.id,
            title: gevent.summary || "Untitled Event",
            description: gevent.description || null,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            all_day: !gevent.start.dateTime,
            location: gevent.location || null,
            provider: "google",
            provider_event_id: gevent.id,
            reminder_minutes: gevent.reminders?.overrides?.[0]?.minutes || (gevent.reminders?.useDefault ? 15 : null),
          }

          await supabase.from("events").upsert(eventData, {
            onConflict: "provider_event_id",
          })

          syncedCount++
        }
      } catch (error) {
        console.error(`Error syncing calendar ${calendar.name}:`, error)
        // Continue with other calendars
      }
    }

    await supabase
      .from("oauth_connections")
      .update({ metadata: { last_sync: new Date().toISOString() } })
      .eq("id", connection.id)

    return NextResponse.json({ calendars: syncedCalendars, events: syncedCount })
  } catch (error) {
    console.error("Auto-sync error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 })
  }
}
