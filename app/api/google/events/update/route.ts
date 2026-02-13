import { createClient } from "@/lib/supabase/server"
import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { refreshAccessToken, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { eventId, sourceGoogleCalendarId } = body

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the event with calendar info
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*, calendar:calendars(*)")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found", details: eventError?.message }, { status: 404 })
    }

    // Only sync if calendar is a Google calendar
    if (!event.calendar?.provider || event.calendar.provider !== "google" || !event.calendar?.provider_calendar_id) {
      return NextResponse.json({ success: true, message: "Not a Google calendar, skipping sync" })
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

    if (connection.refresh_token) {
      try {
        const shouldRefresh = connection.token_expires_at
          ? new Date(connection.token_expires_at) < new Date(Date.now() + 5 * 60 * 1000)
          : true

        if (shouldRefresh) {
          const tokens = await refreshAccessToken(connection.refresh_token)
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
        }
      } catch (refreshError) {
        // Failed to refresh access token
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Google Calendar authorization expired. Please reconnect your account.",
            needsReauth: true,
          },
          { status: 401 },
        )
      }
    }

    const googleAPI = new GoogleCalendarAPI(accessToken)

    let startTime: Date
    let endTime: Date

    try {
      startTime = new Date(event.start_time)
      endTime = new Date(event.end_time)

      // Validate dates are valid
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return NextResponse.json({ error: "Invalid event dates" }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "Failed to parse event dates" }, { status: 400 })
    }

    // Ensure end time is after start time
    if (endTime <= startTime) {
      if (event.reminder_minutes) {
        startTime = new Date(endTime.getTime() - 2 * 60 * 60 * 1000)
      } else {
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      }
    }

    const googleEvent = {
      summary: event.title || "Untitled Event",
      description: event.description || undefined,
      location: event.location || undefined,
      start: event.all_day
        ? { date: startTime.toISOString().split("T")[0] }
        : {
            dateTime: startTime.toISOString(),
            timeZone: "UTC",
          },
      end: event.all_day
        ? { date: endTime.toISOString().split("T")[0] }
        : {
            dateTime: endTime.toISOString(),
            timeZone: "UTC",
          },
      reminders: event.reminder_minutes
        ? {
            useDefault: false,
            overrides: [{ method: "popup", minutes: event.reminder_minutes }],
          }
        : { useDefault: true },
    }

    let googleEventId = event.provider_event_id

    try {
      // Check if this is a calendar move operation
      if (sourceGoogleCalendarId && googleEventId && sourceGoogleCalendarId !== event.calendar.provider_calendar_id) {
        // Move event from source calendar to destination calendar
        try {
          const movedEvent = await googleAPI.moveEvent(
            sourceGoogleCalendarId,
            googleEventId,
            event.calendar.provider_calendar_id,
          )

          if (movedEvent && movedEvent.id) {
            // Update with the moved event details
            await googleAPI.updateEvent(event.calendar.provider_calendar_id, movedEvent.id, googleEvent)
            return NextResponse.json({
              success: true,
              googleEventId: movedEvent.id,
              message: "Event moved to new calendar",
            })
          }
        } catch (moveError) {
          // Move failed (event doesn't exist), create fresh on target calendar
          const createdEvent = await googleAPI.createEvent(event.calendar.provider_calendar_id, googleEvent)
          if (createdEvent && createdEvent.id) {
            await supabase
              .from("events")
              .update({ provider: "google", provider_event_id: createdEvent.id })
              .eq("id", eventId)
          }
          return NextResponse.json({
            success: true,
            googleEventId: createdEvent?.id,
            message: "Event created on new calendar",
          })
        }
      }

      if (googleEventId) {
        // Update existing Google event
        const updateResult = await googleAPI.updateEvent(
          event.calendar.provider_calendar_id,
          googleEventId,
          googleEvent,
        )

        if (updateResult === null) {
          // Event not found in Google, create it instead
          const createdEvent = await googleAPI.createEvent(event.calendar.provider_calendar_id, googleEvent)

          if (createdEvent && createdEvent.id) {
            googleEventId = createdEvent.id
            await supabase
              .from("events")
              .update({
                provider: "google",
                provider_event_id: googleEventId,
              })
              .eq("id", eventId)
          }
        }
      } else {
        // Create new Google event
        const createdEvent = await googleAPI.createEvent(event.calendar.provider_calendar_id, googleEvent)

        if (!createdEvent || !createdEvent.id) {
          return NextResponse.json({
            success: true,
            warning: "Event saved locally but Google sync failed",
            googleEventId: null,
          })
        }

        googleEventId = createdEvent.id

        // Update our event with Google ID
        await supabase
          .from("events")
          .update({
            provider: "google",
            provider_event_id: googleEventId,
          })
          .eq("id", eventId)
      }
    } catch (googleError: any) {
      // The event is already saved locally, just log the sync failure
      console.error("Google API error (event saved locally):", googleError.message || googleError)

      if (googleError.message?.includes("401") || googleError.message?.includes("Unauthorized")) {
        return NextResponse.json(
          {
            success: true,
            warning: "Event saved but Google sync requires re-authentication",
            needsReauth: true,
          },
          { status: 200 },
        )
      }

      // Return success since event is saved locally
      return NextResponse.json({
        success: true,
        warning: "Event saved locally but Google sync failed: " + (googleError.message || "Unknown error"),
        googleEventId: null,
      })
    }

    return NextResponse.json({ success: true, googleEventId })
  } catch (error) {
    console.error("Error in update route:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Update failed",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
