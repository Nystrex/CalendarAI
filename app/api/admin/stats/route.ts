import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const adminPassword = request.headers.get("x-admin-password")
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (profilesError) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    const calRes = await supabase.from("calendars").select("*", { count: "exact", head: true })
    const evtRes = await supabase.from("events").select("*", { count: "exact", head: true })
    const calByUser = await supabase.from("calendars").select("user_id")
    const evtByUser = await supabase.from("events").select("user_id")
    const oauthRes = await supabase.from("oauth_connections").select("user_id, provider, is_active")

    const totalCalendars = calRes.count ?? 0
    const totalEvents = evtRes.count ?? 0
    const calendarRows = calByUser.data ?? []
    const eventRows = evtByUser.data ?? []
    const oauthRows = oauthRes.data ?? []

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(todayStart)
    monthStart.setDate(monthStart.getDate() - 30)

    const evTodayRes = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())

    const evWeekRes = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString())

    const evMonthRes = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString())

    const activeUsersTodayRes = await supabase
      .from("events")
      .select("user_id")
      .gte("created_at", todayStart.toISOString())

    const activeUsersWeekRes = await supabase
      .from("events")
      .select("user_id")
      .gte("created_at", weekStart.toISOString())

    const newUsersThisWeek = profiles.filter(
      (p) => new Date(p.created_at) >= weekStart
    ).length

    const userEventMap = eventRows.reduce(
      (acc, event) => {
        acc[event.user_id] = (acc[event.user_id] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    let mostActiveUser = null
    const sorted = Object.entries(userEventMap).sort(([, a], [, b]) => b - a)
    if (sorted.length > 0) {
      const [uid, count] = sorted[0]
      const profile = profiles.find((p) => p.id === uid)
      mostActiveUser = {
        email: profile?.email || "Unknown",
        events: count,
      }
    }

    const allEventsRes = await supabase
      .from("events")
      .select("start_time")
      .gte("created_at", monthStart.toISOString())

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const dayCounts = (allEventsRes.data ?? []).reduce(
      (acc, event) => {
        const day = new Date(event.start_time).getDay()
        acc[day] = (acc[day] || 0) + 1
        return acc
      },
      {} as Record<number, number>
    )

    let busiestDay = null
    if (Object.keys(dayCounts).length > 0) {
      const busiest = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]
      busiestDay = {
        day: dayNames[Number.parseInt(busiest[0])],
        count: busiest[1],
      }
    }

    const auditRes = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    const auditLogsWithEmails = (auditRes.data ?? []).map((log) => {
      const profile = profiles.find((p) => p.id === log.user_id)
      return { ...log, user_email: profile?.email }
    })

    const userStats = profiles.map((profile) => {
      const userCalendars = calendarRows.filter((c) => c.user_id === profile.id).length
      const userEvents = eventRows.filter((e) => e.user_id === profile.id).length
      const googleConnected = oauthRows.some(
        (o) => o.user_id === profile.id && o.provider === "google" && o.is_active
      )

      return {
        id: profile.id,
        email: profile.email || "No email",
        full_name: profile.full_name || "No name",
        time_zone: profile.time_zone || "Not set",
        university: profile.university || null,
        university_verified: profile.university_verified || false,
        subscription_tier: profile.subscription_tier || "free",
        subscription_status: profile.subscription_status || "inactive",
        created_at: profile.created_at,
        calendars_count: userCalendars,
        events_count: userEvents,
        google_connected: googleConnected,
      }
    })

    return NextResponse.json({
      total_users: profiles.length,
      total_calendars: totalCalendars,
      total_events: totalEvents,
      google_connections: oauthRows.filter((o) => o.is_active).length,
      users: userStats,
      activity: {
        events_today: evTodayRes.count ?? 0,
        events_this_week: evWeekRes.count ?? 0,
        events_this_month: evMonthRes.count ?? 0,
        active_users_today: new Set(activeUsersTodayRes.data?.map((e) => e.user_id)).size,
        active_users_this_week: new Set(activeUsersWeekRes.data?.map((e) => e.user_id)).size,
        new_users_this_week: newUsersThisWeek,
        most_active_user: mostActiveUser,
        busiest_day: busiestDay,
      },
      recent_audit_logs: auditLogsWithEmails,
    })
  } catch (error) {
    console.error("[CalendarAI] Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
