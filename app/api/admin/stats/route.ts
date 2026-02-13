import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "mohammedcacouni@gmail.com";

export async function GET(request: NextRequest) {
  console.log("[CalendarAI] Fetching admin stats...");
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

    // Fetch auth users with more detailed error logging
    console.log("[CalendarAI] Attempting to list auth users...");
    const { data: authUsersResult, error: authError } = await adminSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("[CalendarAI] CRITICAL ERROR fetching auth users:", {
        message: authError.message,
        status: authError.status,
        details: authError
      });
      // Instead of crashing the whole API, we'll continue with an empty user list
      // so we can see if other parts of the DB are working.
    }

    const authUsers = authUsersResult?.users || [];

    console.log("[CalendarAI] Fetching profiles...");
    const { data: profiles, error: profilesError } = await adminSupabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("[CalendarAI] Error fetching profiles:", profilesError);
      return NextResponse.json({ error: "Failed to fetch profiles: " + profilesError.message }, { status: 500 });
    }

    console.log("[CalendarAI] Fetching counts...");
    const { count: totalCalendars } = await adminSupabase.from("calendars").select("*", { count: "exact", head: true });
    const { count: totalEvents } = await adminSupabase.from("events").select("*", { count: "exact", head: true });

    // Fetch raw data for counts and connections
    const { data: calendarCountsData } = await adminSupabase.from("calendars").select("user_id");
    const { data: eventCountsData } = await adminSupabase.from("events").select("user_id");
    const { data: oauthConnectionsData } = await adminSupabase.from("oauth_connections").select("user_id, provider, is_active");

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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    const { count: eventsToday } = await adminSupabase.from("events").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString());
    const { count: eventsThisWeek } = await adminSupabase.from("events").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString());
    const { count: eventsThisMonth } = await adminSupabase.from("events").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString());

    const { data: activeUsersTodayData } = await adminSupabase.from("events").select("user_id").gte("created_at", todayStart.toISOString());
    const { data: activeUsersWeekData } = await adminSupabase.from("events").select("user_id").gte("created_at", weekStart.toISOString());
      
    const activeUsersToday = new Set(activeUsersTodayData?.map(e => e.user_id));
    const activeUsersWeek = new Set(activeUsersWeekData?.map(e => e.user_id));

    const userStats = authUsers.length > 0 ? authUsers.map((authUser) => {
      const profile = profilesById.get(authUser.id);
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
        calendars_count: calendarCounts[authUser.id] || 0,
        events_count: eventCounts[authUser.id] || 0,
        google_connected: googleConnectedUsers.has(authUser.id),
      };
    }) : profiles.map(profile => ({
        id: profile.id,
        email: profile.email || "No email",
        full_name: profile.full_name || "No name",
        time_zone: profile.time_zone || "Not set",
        university: profile.university || null,
        university_verified: profile.university_verified || false,
        subscription_tier: profile.subscription_tier || "free",
        subscription_status: profile.subscription_status || "inactive",
        created_at: profile.created_at,
        calendars_count: calendarCounts[profile.id] || 0,
        events_count: eventCounts[profile.id] || 0,
        google_connected: googleConnectedUsers.has(profile.id),
    }));

    const stats = {
      total_users: authUsers.length || profiles.length,
      total_calendars: totalCalendars || 0,
      total_events: totalEvents || 0,
      google_connections: oauthConnectionsData?.filter((o) => o.is_active).length || 0,
      users: userStats,
      activity: {
        events_today: eventsToday || 0,
        events_this_week: eventsThisWeek || 0,
        events_this_month: eventsThisMonth || 0,
        active_users_today: activeUsersToday.size,
        active_users_this_week: activeUsersWeek.size,
        new_users_this_week: authUsers.filter(u => new Date(u.created_at) >= weekStart).length,
      },
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[CalendarAI] Global Admin stats error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}