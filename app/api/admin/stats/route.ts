import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "mohammedcacouni@gmail.com";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: authUsers, error: authError } =
      await adminSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("[CalendarAI] Error fetching auth users:", authError);
      return NextResponse.json(
        { error: "Failed to fetch auth users" },
        { status: 500 }
      );
    }

    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("[CalendarAI] Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const { count: totalCalendars } = await adminSupabase
      .from("calendars")
      .select("*", { count: "exact", head: true });

    const { count: totalEvents } = await adminSupabase
      .from("events")
      .select("*", { count: "exact", head: true });

    // --- OPTIMIZATION START ---

    // Fetch raw data for counts and connections
    const { data: calendarCountsData } = await adminSupabase
      .from("calendars")
      .select("user_id");
    const { data: eventCountsData } = await adminSupabase
      .from("events")
      .select("user_id");
    const { data: oauthConnectionsData } = await adminSupabase
      .from("oauth_connections")
      .select("user_id, provider, is_active");

    // Process data into efficient lookups (Hash Maps and Sets)
    const calendarCounts = (calendarCountsData || []).reduce((acc, { user_id }) => {
      if (user_id) acc[user_id] = (acc[user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventCounts = (eventCountsData || []).reduce((acc, { user_id }) => {
      if (user_id) acc[user_id] = (acc[user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const googleConnectedUsers = new Set(
      (oauthConnectionsData || [])
        .filter((o) => o.user_id && o.provider === "google" && o.is_active)
        .map((o) => o.user_id)
    );

    const profilesById = new Map(profiles.map((p) => [p.id, p]));

    // --- OPTIMIZATION END ---

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Events created in different time periods
    const { count: eventsToday } = await adminSupabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    const { count: eventsThisWeek } = await adminSupabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString());

    const { count: eventsThisMonth } = await adminSupabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString());

    // Active users (users who created events)
    const { data: activeUsersTodayData } = await adminSupabase
      .from("events")
      .select("user_id")
      .gte("created_at", todayStart.toISOString());

    const { data: activeUsersWeekData } = await adminSupabase
      .from("events")
      .select("user_id")
      .gte("created_at", weekStart.toISOString());
      
    const activeUsersToday = new Set(activeUsersTodayData?.map(e => e.user_id));
    const activeUsersWeek = new Set(activeUsersWeekData?.map(e => e.user_id));


    // New users this week
    const newUsersThisWeek = authUsers.users.filter(
      (u) => new Date(u.created_at) >= weekStart
    ).length;

    // Most active user (by event count)
    let mostActiveUser = null;
    const userEventCounts = eventCounts; // Use the aggregated map
    if (userEventCounts && Object.keys(userEventCounts).length > 0) {
      const mostActiveUserId = Object.entries(userEventCounts).sort(
        ([, a], [, b]) => b - a
      )[0];
      if (mostActiveUserId) {
        const user = authUsers.users.find((u) => u.id === mostActiveUserId[0]);
        mostActiveUser = {
          email: user?.email || "Unknown",
          events: mostActiveUserId[1],
        };
      }
    }

    // Busiest day of the week
    const { data: allEvents } = await adminSupabase
      .from("events")
      .select("start_time")
      .gte("created_at", monthStart.toISOString());

    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayCounts = allEvents?.reduce((acc, event) => {
      const day = new Date(event.start_time).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    let busiestDay = null;
    if (dayCounts && Object.keys(dayCounts).length > 0) {
      const busiest = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];
      busiestDay = {
        day: dayNames[Number.parseInt(busiest[0])],
        count: busiest[1],
      };
    }

    const { data: recentAuditLogs } = await adminSupabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const auditLogsWithEmails = recentAuditLogs?.map((log) => {
      const user = authUsers.users.find((u) => u.id === log.user_id);
      return {
        ...log,
        user_email: user?.email,
      };
    });

    const userStats = authUsers.users.map((authUser) => {
      const profile = profilesById.get(authUser.id);
      const userCalendars = calendarCounts[authUser.id] || 0;
      const userEvents = eventCounts[authUser.id] || 0;
      const googleConnected = googleConnectedUsers.has(authUser.id);

      return {
        id: authUser.id,
        email: authUser.email || "No email",
        full_name: profile?.full_name || "No name",
        time_zone: profile?.time_zone || "Not set",
        university: profile?.university || null,
        university_verified: profile?.university_verified || false,
        subscription_tier: profile?.subscription_tier || "free",
        subscription_status: profile?.subscription_status || "inactive",
        created_at: authUser.created_at,
        calendars_count: userCalendars,
        events_count: userEvents,
        google_connected: googleConnected,
      };
    });

    const stats = {
      total_users: authUsers.users.length,
      total_calendars: totalCalendars || 0,
      total_events: totalEvents || 0,
      google_connections:
        oauthConnectionsData?.filter((o) => o.is_active).length || 0,
      users: userStats,
      activity: {
        events_today: eventsToday || 0,
        events_this_week: eventsThisWeek || 0,
        events_this_month: eventsThisMonth || 0,
        active_users_today: activeUsersToday.size,
        active_users_this_week: activeUsersWeek.size,
        new_users_this_week: newUsersThisWeek,
        most_active_user: mostActiveUser,
        busiest_day: busiestDay,
      },
      recent_audit_logs: auditLogsWithEmails || [],
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[CalendarAI] Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}