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

    // Use regular client to fetch all data from database
    const { data: profiles, error: profilesError} = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("[CalendarAI] Error fetching profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    const { count: totalCalendars } = await supabase.from("calendars").select("*", { count: "exact", head: true })

    const { count: totalEvents } = await supabase.from("events").select("*", { count: "exact", head: true })

    const { data: calendarCounts } = await supabase.from("calendars").select("user_id")

    const { data: eventCounts } = await supabase.from("events").select("user_id")

    const { data: oauthConnections } = await supabase
      .from("oauth_connections")
      .select("user_id, provider, is_active")

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(todayStart)
    monthStart.setDate(monthStart.getDate() - 30)

    // Events created in different time periods
    const { count: eventsToday } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())

    const { count: eventsThisWeek } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString())

    const { count: eventsThisMonth } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString())

    // Active users (users who created events)
    const { data: activeUsersToday } = await supabase
      .from("events")
      .select("user_id")
      .gte("created_at", todayStart.toISOString())

    const { data: activeUsersWeek } = await supabase
      .from("events")
      .select("user_id")
      .gte("created_at", weekStart.toISOString())

    // New users this week
    const newUsersThisWeek = profiles.filter((p) => new Date(p.created_at) >= weekStart).length

    // Most active user (by event count)
    const userEventCounts = eventCounts?.reduce(
      (acc, event) => {
        acc[event.user_id] = (acc[event.user_id] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    let mostActiveUser = null
    if (userEventCounts) {
      const mostActiveUserId = Object.entries(userEventCounts).sort(([, a], [, b]) => b - a)[0]
      if (mostActiveUserId) {
        const profile = profiles.find((p) => p.id === mostActiveUserId[0])
        mostActiveUser = {
          email: profile?.email || "Unknown",
          events: mostActiveUserId[1],
        }
      }
    }

    // Busiest day of the week
    const { data: allEvents } = await supabase
      .from("events")
      .select("start_time")
      .gte("created_at", monthStart.toISOString())

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const dayCounts = allEvents?.reduce(
      (acc, event) => {
        const day = new Date(event.start_time).getDay()
        acc[day] = (acc[day] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    let busiestDay = null
    if (dayCounts && Object.keys(dayCounts).length > 0) {
      const busiest = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]
      busiestDay = {
        day: dayNames[Number.parseInt(busiest[0])],
        count: busiest[1],
      }
    }

    const { data: recentAuditLogs } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    // Add user emails to audit logs
    const auditLogsWithEmails = recentAuditLogs?.map((log) => {
      const profile = profiles.find((p) => p.id === log.user_id)
      return {
        ...log,
        user_email: profile?.email,
      }
    })

    const userStats = profiles.map((profile) => {
      const userCalendars = calendarCounts?.filter((c) => c.user_id === profile.id).length || 0
      const userEvents = eventCounts?.filter((e) => e.user_id === profile.id).length || 0
      const googleConnected =
        oauthConnections?.some((o) => o.user_id === profile.id && o.provider === "google" && o.is_active) || false

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

    const stats = {
      total_users: profiles.length,
      total_calendars: totalCalendars || 0,
      total_events: totalEvents || 0,
      google_connections: oauthConnections?.filter((o) => o.is_active).length || 0,
      users: userStats,
      activity: {
        events_today: eventsToday || 0,
        events_this_week: eventsThisWeek || 0,
        events_this_month: eventsThisMonth || 0,
        active_users_today: new Set(activeUsersToday?.map((e) => e.user_id)).size,
        active_users_this_week: new Set(activeUsersWeek?.map((e) => e.user_id)).size,
        new_users_this_week: newUsersThisWeek,
        most_active_user: mostActiveUser,
        busiest_day: busiestDay,
      },
      recent_audit_logs: auditLogsWithEmails || [],
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[CalendarAI] Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
