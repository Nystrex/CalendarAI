import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendDiscordNotification } from "@/lib/discord/bot"

export async function POST(req: NextRequest) {
  try {
    const { eventId, userId } = await req.json()

    if (!eventId || !userId) {
      return NextResponse.json({ error: "Missing eventId or userId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user's Discord info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("discord_id, discord_notifications_enabled")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.discord_id || !profile.discord_notifications_enabled) {
      return NextResponse.json({ error: "User has not enabled Discord notifications" }, { status: 400 })
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title, description, start_time")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Send Discord notification
    const success = await sendDiscordNotification(
      profile.discord_id,
      event.title,
      event.description || "",
      new Date(event.start_time)
    )

    if (!success) {
      return NextResponse.json({ error: "Failed to send Discord notification" }, { status: 500 })
    }

    // Record notification sent (ignore if already exists due to UNIQUE constraint)
    try {
      await supabase
        .from("discord_notifications")
        .insert({
          user_id: userId,
          event_id: eventId,
          notified_at: new Date().toISOString(),
        })
    } catch {
      // Ignore duplicate key errors
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[discord/notify] error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
