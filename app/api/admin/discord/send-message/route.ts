import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const DISCORD_API_BASE = "https://discord.com/api/v10"
const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function POST(req: NextRequest) {
  const steps: string[] = []

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    steps.push("1. Parsing request body")
    const { userId, eventId, adminPassword } = await req.json()

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!userId || !eventId) {
      return NextResponse.json({ error: "Missing userId or eventId" }, { status: 400 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: "DISCORD_BOT_TOKEN not configured on server" }, { status: 500 })
    }

    steps.push("2. Fetching user profile from Supabase")
    const adminSupabase = createAdminClient()
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("discord_id, discord_username")
      .eq("id", userId)
      .single()

    if (profileError || !profile?.discord_id) {
      return NextResponse.json({
        error: "User has not connected Discord",
        details: profileError?.message || "No discord_id found",
        steps,
      }, { status: 400 })
    }

    steps.push(`3. Found user discord_id: ${profile.discord_id}`)

    steps.push("4. Fetching event from Supabase")
    const { data: event, error: eventError } = await adminSupabase
      .from("events")
      .select("title, description, start_time")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({
        error: "Event not found",
        details: eventError?.message || "No event found",
        steps,
      }, { status: 404 })
    }

    steps.push(`5. Found event: ${event.title}`)

    // Step 1: Create DM channel
    steps.push("6. Creating DM channel with Discord API")
    const dmResponse = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: profile.discord_id }),
    })

    const dmResponseText = await dmResponse.text()
    steps.push(`7. DM channel response: ${dmResponse.status} ${dmResponseText.substring(0, 200)}`)

    if (!dmResponse.ok) {
      return NextResponse.json({
        error: "Failed to create DM channel",
        discord_status: dmResponse.status,
        discord_error: dmResponseText,
        steps,
      }, { status: 500 })
    }

    const dmChannel = JSON.parse(dmResponseText)

    // Step 2: Send message (embed with absolute + relative timestamps)
    const eventDate = new Date(event.start_time)
    const unix = Math.floor(eventDate.getTime() / 1000)
    const content = `⏰ Reminder <t:${unix}:R>`
    const embed = {
      title: "Event Reminder",
      description: [`**${event.title}**`, (event.description || "").trim()].filter(Boolean).join("\n\n"),
      color: 0x5865f2,
      fields: [
        { name: "When", value: `<t:${unix}:F> (<t:${unix}:R>)` },
      ],
    }

    steps.push(`8. Sending message to channel ${dmChannel.id}`)
    const msgResponse = await fetch(`${DISCORD_API_BASE}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, embeds: [embed] }),
    })

    const msgResponseText = await msgResponse.text()
    steps.push(`9. Message response: ${msgResponse.status} ${msgResponseText.substring(0, 200)}`)

    if (!msgResponse.ok) {
      return NextResponse.json({
        error: "Failed to send message",
        discord_status: msgResponse.status,
        discord_error: msgResponseText,
        steps,
      }, { status: 500 })
    }

    steps.push("10. Message sent successfully!")

    return NextResponse.json({
      success: true,
      message: `Discord message sent to ${profile.discord_username || profile.discord_id}`,
      discord_id: profile.discord_id,
      event_title: event.title,
      steps,
    })
  } catch (error) {
    return NextResponse.json({
      error: "Internal server error",
      details: String(error),
      steps,
    }, { status: 500 })
  }
}
