import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { calendarId } = await request.json()

    if (!calendarId) {
      return NextResponse.json({ error: "Calendar ID is required" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the Google access token for this user
    const { data: authData, error: authError } = await supabase
      .from("oauth_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .single()

    if (authError || !authData?.access_token) {
      return NextResponse.json(
        { success: false, error: "Google authorization not found", warning: true },
        { status: 200 },
      )
    }

    const api = new GoogleCalendarAPI(authData.access_token)

    await api.deleteCalendar(calendarId)

    return NextResponse.json({
      success: true,
      message: "Calendar deleted from Google",
    })
  } catch (error: any) {
    console.error("Error deleting Google Calendar:", error)

    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return NextResponse.json({
        success: false,
        error: "Calendar not found in Google",
        warning: true,
      })
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to delete calendar from Google",
        success: false,
      },
      { status: 500 },
    )
  }
}
