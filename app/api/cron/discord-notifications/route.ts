import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendDiscordNotification } from "@/lib/discord/bot"

/**
 * Vercel Cron Job - Check for upcoming events and send Discord notifications
 * Runs every 5 minutes
 * 
 * This endpoint is called automatically by Vercel Cron
 * It doesn't need to keep a persistent connection to Discord
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()
    // Window: send notifications whose target time falls within [now - 1m, now + 5m]
    const windowStart = new Date(now.getTime() - 1 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 5 * 60 * 1000)
    // Only look ahead up to 7 days to keep queries light
    const horizonEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get all users with Discord enabled
    const { data: usersWithDiscord, error: usersError } = await supabase
      .from("profiles")
      .select("id, discord_id, discord_notifications_enabled")
      .eq("discord_notifications_enabled", true)
      .not("discord_id", "is", null)

    if (usersError) {
      console.error("[cron/discord] Error fetching users:", usersError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    if (!usersWithDiscord || usersWithDiscord.length === 0) {
      return NextResponse.json({
        status: "success",
        message: "No users with Discord notifications enabled",
        notifications_sent: 0,
      })
    }

    let notificationsSent = 0
    let errors: string[] = []

    // For each user, check upcoming events and compute per-event reminder window
    for (const user of usersWithDiscord) {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title, description, start_time, reminder_minutes")
        .eq("user_id", user.id)
        .gte("start_time", now.toISOString())
        .lte("start_time", horizonEnd.toISOString())

      if (eventsError) {
        console.error(`[cron/discord] Error fetching events for user ${user.id}:`, eventsError)
        errors.push(`User ${user.id}: ${eventsError.message}`)
        continue
      }

      if (!events || events.length === 0) {
        continue
      }

      // Filter events whose target send time is within the window
      for (const event of events) {
        const remindMinutes = (event as any).reminder_minutes ?? 15
        const eventStart = new Date(event.start_time)
        const targetSendTime = new Date(eventStart.getTime() - remindMinutes * 60 * 1000)

        // Skip if not within window
        if (targetSendTime < windowStart || targetSendTime > windowEnd) {
          continue
        }

        // Check which events have already been notified
        const { data: notified } = await supabase
          .from("discord_notifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("event_id", event.id)
          .maybeSingle()

        if (notified) {
          // Already notified
          continue
        }

        // Check snooze/done state
        const { data: state } = await supabase
          .from("discord_notification_state")
          .select("snoozed_until, dismissed_at")
          .eq("user_id", user.id)
          .eq("event_id", event.id)
          .maybeSingle()

        if (state?.dismissed_at) {
          // Marked as done - skip
          continue
        }

        if (state?.snoozed_until && new Date(state.snoozed_until) > now) {
          // Still snoozed - skip
          continue
        }

        // Send Discord notification with eventId and userId for buttons
        const success = await sendDiscordNotification(
          user.discord_id!,
          event.title,
          event.description || "",
          new Date(event.start_time),
          event.id,
          user.id
        )

        if (success) {
          // Record notification sent
          await supabase.from("discord_notifications").insert({
            user_id: user.id,
            event_id: event.id,
            notified_at: new Date().toISOString(),
          })
          notificationsSent++
        } else {
          errors.push(`Failed to notify user ${user.id} for event ${event.id}`)
        }
      }
    }

    return NextResponse.json({
      status: "success",
      message: `Discord notifications processed`,
      users_checked: usersWithDiscord.length,
      notifications_sent: notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[cron/discord] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
