import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

async function checkTrial() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status, trial_ends_at, trial_used")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if trial has expired
    if (
      profile.subscription_status === "trialing" && 
      profile.trial_ends_at
    ) {
      const trialEndDate = new Date(profile.trial_ends_at)
      const now = new Date()

      if (now > trialEndDate) {
        // Trial has expired, downgrade to free
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "inactive",
            trial_ends_at: null,
          })
          .eq("id", user.id)

        return NextResponse.json({
          expired: true,
          message: "Your free trial has ended",
          tier: "free"
        })
      }

      // Trial still active
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return NextResponse.json({
        expired: false,
        trialing: true,
        daysRemaining,
        expiresAt: profile.trial_ends_at,
        tier: "premium"
      })
    }

    // Not on trial
    return NextResponse.json({
      expired: false,
      trialing: false,
      tier: profile.subscription_tier
    })

  } catch (error) {
    console.error("Trial check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST() {
  return checkTrial()
}

export async function GET() {
  return checkTrial()
}
