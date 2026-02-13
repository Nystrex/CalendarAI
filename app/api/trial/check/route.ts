import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("trial_used, trial_ends_at, subscription_status")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("[CalendarAI] Error fetching user trial status:", error);
      return NextResponse.json({ error: "Failed to fetch trial status" }, { status: 500 });
    }

    const isTrialing = profile.subscription_status === 'trialing' && new Date(profile.trial_ends_at) > new Date();
    
    return NextResponse.json({
      trialing: isTrialing,
      trial_used: profile.trial_used,
      trial_ends_at: profile.trial_ends_at,
    });
  } catch (error) {
    console.error("[CalendarAI] Server error checking trial status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
