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

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    console.log("[Admin Stats] Profiles fetched:", profiles?.length || 0)
    if (profilesError) {
      console.error("[Admin Stats] Error fetching profiles:", profilesError)
    }

    // Even if no profiles exist yet, continue to show auth users
    const profiles_safe = profiles || []

    // Fetch calendars count
    const { count: totalCalendars } = await supabase
      .from("calendars")
      .select("*", { count: "exact", head: true })

    const { data: calendarsByUser } = await supabase
      .from("calendars")
      .select("user_id")

    // Fetch events count
    const { count: totalEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })

    const { data: eventsByUser } = await supabase
      .from("events")
      .select("user_id")

    // Fetch oauth connections
    const { data: oauthConnections } = await supabase
      .from("oauth_connections")
      .select("*")

    // Calculate activity metrics
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

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

    // Active users
    const { data: activeUsersToday } = await supabase
      .from("events")
      .select("user_id")
      .gte("created_at", todayStart.toISOString())

    const { data: activeUsersWeek } = await supabase
      .from("events")
      .select("user_id")
      .gte("created_at", weekStart.toISOString())

    // New users this week
    const newUsersThisWeek = profiles_safe.filter((p) => new Date(p.created_at) >= weekStart).length

    // Count user events
    const userEventCounts: Record<string, number> = {}
    eventsByUser?.forEach((row) => {
      userEventCounts[row.user_id] = (userEventCounts[row.user_id] || 0) + 1
    })

    // Most active user
    let mostActiveUser = null
    if (Object.keys(userEventCounts).length > 0) {
      const topUser = Object.entries(userEventCounts).sort(([, a], [, b]) => b - a)[0]
      const profile = profiles_safe.find((p) => p.id === topUser[0])
      mostActiveUser = {
        email: profile?.email || "Unknown",
        events: topUser[1],
      }
    }

    // Audit logs
    const { data: auditLogs } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    // User stats
    const userStats = profiles_safe.map((profile) => {
      const calendarCount = calendarsByUser?.filter((c) => c.user_id === profile.id).length || 0
      const eventCount = eventsByUser?.filter((e) => e.user_id === profile.id).length || 0
      const googleConnected =
        oauthConnections?.some((o) => o.user_id === profile.id && o.provider === "google" && o.is_active) || false

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        university: profile.university,
        university_verified: profile.university_verified,
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        created_at: profile.created_at,
        calendars_count: calendarCount,
        events_count: eventCount,
        google_connected: googleConnected,
      }
    })

    return NextResponse.json({
      total_users: profiles_safe.length,
      total_calendars: totalCalendars || 0,
      total_events: totalEvents || 0,
      google_connections: oauthConnections?.filter((o) => o.provider === "google" && o.is_active).length || 0,
      users: userStats,
      activity: {
        events_today: eventsToday || 0,
        events_this_week: eventsThisWeek || 0,
        events_this_month: eventsThisMonth || 0,
        active_users_today: new Set(activeUsersToday?.map((u) => u.user_id)).size || 0,
        active_users_this_week: new Set(activeUsersWeek?.map((u) => u.user_id)).size || 0,
        new_users_this_week: newUsersThisWeek,
        most_active_user: mostActiveUser,
        busiest_day: null,
      },
      recent_audit_logs: auditLogs || [],
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
