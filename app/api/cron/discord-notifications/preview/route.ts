import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Diagnostic endpoint: shows which events would be sent right now and why
// Secured with the same CRON_SECRET header
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const url = new URL(request.url)
    const userId = url.searchParams.get("user_id") || undefined

    const now = new Date()
    const windowStart = new Date(now.getTime() - 1 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 5 * 60 * 1000)
    const horizonEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Load users with Discord notifications enabled
    let userQuery = supabase
      .from("profiles")
      .select("id, email, discord_id, discord_notifications_enabled")
      .eq("discord_notifications_enabled", true)
      .not("discord_id", "is", null)

    if (userId) {
      userQuery = userQuery.eq("id", userId)
    }

    const { data: users, error: usersError } = await userQuery
    if (usersError) {
      throw usersError
    }

    const results: any[] = []

    for (const user of users || []) {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id, title, description, start_time, reminder_minutes")
        .eq("user_id", user.id)
        .gte("start_time", now.toISOString())
        .lte("start_time", horizonEnd.toISOString())
        .order("start_time", { ascending: true })
        .limit(50)

      if (eventsError) {
        results.push({ user_id: user.id, error: `eventsError: ${eventsError.message}` })
        continue
      }

      const diagnostics = [] as any[]
      for (const ev of events || []) {
        const remindMinutes = (ev as any).reminder_minutes ?? 15
        const start = new Date(ev.start_time)
        const targetSendTime = new Date(start.getTime() - remindMinutes * 60 * 1000)

        // Check already notified
        const { data: notified } = await supabase
          .from("discord_notifications")
          .select("id, notified_at")
          .eq("user_id", user.id)
          .eq("event_id", ev.id)
          .maybeSingle()

        const inWindow = targetSendTime >= windowStart && targetSendTime <= windowEnd

        diagnostics.push({
          event_id: ev.id,
          title: ev.title,
          start_time: ev.start_time,
          reminder_minutes: remindMinutes,
          target_send_time: targetSendTime.toISOString(),
          in_window: inWindow,
          already_notified: Boolean(notified),
          skip_reason: notified
            ? "already_notified"
            : inWindow
            ? null
            : targetSendTime < windowStart
            ? "too_early_or_missed"
            : "too_late_future_window",
        })
      }

      results.push({
        user_id: user.id,
        email: user.email,
        events_checked: diagnostics.length,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        diagnostics,
      })
    }

    return NextResponse.json({ now: now.toISOString(), results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
