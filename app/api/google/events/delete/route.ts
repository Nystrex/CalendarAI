import { createClient } from "@/lib/supabase/server"
import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { refreshAccessToken, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 })
    }

    const { eventId } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the event to find calendar and Google IDs
    const { data: event } = await supabase.from("events").select("*, calendar:calendars(*)").eq("id", eventId).single()

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // If event isn't synced with Google, just return success
    if (!event.provider_event_id || !event.calendar?.provider_calendar_id) {
      return NextResponse.json({ success: true })
    }

    // Get Google OAuth connection
    const { data: connections } = await supabase
      .from("oauth_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ success: true })
    }

    const connection = connections[0]
    let accessToken = connection.access_token

    // Refresh token if expired
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at)
      if (expiresAt < new Date()) {
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
      }
    }

    const googleAPI = new GoogleCalendarAPI(accessToken)

    // Delete from Google Calendar
    try {
      await googleAPI.deleteEvent(event.calendar.provider_calendar_id, event.provider_event_id)
    } catch (error) {
      // If event doesn't exist in Google Calendar (404), that's okay
      console.log("Error deleting from Google (might not exist):", error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 })
  }
}
