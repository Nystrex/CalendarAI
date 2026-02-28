import { createAdminClient } from "@/lib/supabase/admin"

interface UserWithDiscord {
  id: string
  discord_id: string
  discord_notifications_enabled: boolean
}

interface EventToNotify {
  id: string
  title: string
  description: string | null
  start_time: string
  user_id: string
}

/**
 * Check for upcoming events and send Discord notifications
 * Should be called periodically (e.g., every 5 minutes)
 */
export async function sendUpcomingEventNotifications() {
  try {
    const supabase = createAdminClient()

    // Get all users with Discord enabled
    const { data: usersWithDiscord, error: usersError } = await supabase
      .from("profiles")
      .select("id, discord_id, discord_notifications_enabled")
      .eq("discord_notifications_enabled", true)
      .not("discord_id", "is", null)

    if (usersError) {
      console.error("[discord notifications] error fetching users:", usersError)
      return
    }

    if (!usersWithDiscord || usersWithDiscord.length === 0) {
      return
    }

    const now = new Date()
    const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000)

    // For each user, find upcoming events
    for (const user of usersWithDiscord as UserWithDiscord[]) {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title, description, start_time, user_id")
        .eq("user_id", user.id)
        .gte("start_time", now.toISOString())
        .lte("start_time", fifteenMinLater.toISOString())

      if (eventsError) {
        console.error(`[discord notifications] error fetching events for user ${user.id}:`, eventsError)
        continue
      }

      if (!events || events.length === 0) {
        continue
      }

      // Check which events have already been notified
      for (const event of events as EventToNotify[]) {
        const { data: notified } = await supabase
          .from("discord_notifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("event_id", event.id)
          .single()

        if (notified) {
          // Already notified
          continue
        }

        // Send notification via API
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/discord/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              eventId: event.id,
            }),
          })
        } catch (err) {
          console.error(`[discord notifications] failed to notify user ${user.id} for event ${event.id}:`, err)
        }
      }
    }
  } catch (error) {
    console.error("[discord notifications] unexpected error:", error)
  }
}

/**
 * Manually send a Discord notification for a specific event
 */
export async function notifyUserAboutEvent(userId: string, eventId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/discord/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, eventId }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[discord] notification failed:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[discord] notification error:", error)
    return false
  }
}
