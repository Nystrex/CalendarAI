import { createClient } from "@/lib/supabase/server"
import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { refreshAccessToken, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 })
    }

    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json({ error: "Missing calendar name" }, { status: 400 })
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
      return NextResponse.json({ error: "No Google account connected. Please connect your Google account first." }, { status: 400 })
    }

    const connection = connections[0]
    let accessToken = connection.access_token

    // Refresh token if needed
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
        console.error("[v0] Failed to refresh access token:", refreshError)
        return NextResponse.json(
          {
            error: "Google Calendar authorization expired. Please reconnect your account.",
            needsReauth: true,
          },
          { status: 401 },
        )
      }
    }

    const googleAPI = new GoogleCalendarAPI(accessToken)

    // Create calendar in Google
    try {
      const googleCalendar = await googleAPI.createCalendar({
        summary: name,
        description: `Created from Calendar App`,
        timeZone: "UTC",
      })

      if (!googleCalendar || !googleCalendar.id) {
        return NextResponse.json({ error: "Failed to create calendar in Google" }, { status: 500 })
      }



      return NextResponse.json({ 
        success: true, 
        calendarId: googleCalendar.id,
        calendarName: googleCalendar.summary
      })
    } catch (googleError: any) {
      
      if (googleError.message?.includes("401") || googleError.message?.includes("Unauthorized")) {
        return NextResponse.json(
          {
            error: "Google authorization expired. Please reconnect your Google account.",
            needsReauth: true,
          },
          { status: 401 },
        )
      }

      return NextResponse.json(
        { 
          error: "Failed to create calendar in Google: " + (googleError.message || "Unknown error")
        },
        { status: 500 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create calendar",
      },
      { status: 500 },
    )
  }
}
