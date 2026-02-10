import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("trial_used, subscription_tier, subscription_status")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if already used trial
    if (profile.trial_used) {
      return NextResponse.json({ 
        error: "You have already used your free trial" 
      }, { status: 400 })
    }

    // Check if already premium (not trial)
    if (profile.subscription_tier === "premium" && profile.subscription_status === "active") {
      return NextResponse.json({ 
        error: "You already have an active Premium subscription" 
      }, { status: 400 })
    }

    // Grant trial - set expiry to 14 days from now
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "premium",
        subscription_status: "trialing",
        trial_used: false, // Not marked as used until trial expires
        trial_ends_at: trialEndsAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Trial claim error:", updateError)
      return NextResponse.json({ error: "Failed to claim trial" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "Free trial activated! Enjoy 14 days of Premium.",
      expiresAt: trialEndsAt.toISOString()
    })
  } catch (error) {
    console.error("Trial claim error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
