import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireBotSecret } from "../_shared"

export async function POST(request: NextRequest) {
  if (!requireBotSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, eventId, minutes } = await request.json()

    if (!userId || !eventId || typeof minutes !== "number") {
      return NextResponse.json({ error: "Missing userId, eventId, or minutes" }, { status: 400 })
    }

    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("discord_notification_state")
      .upsert({
        user_id: userId,
        event_id: eventId,
        snoozed_until: snoozedUntil,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, snoozed_until: snoozedUntil })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
