import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@calendar.ai"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Only admin can create demo user
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Create demo user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "demo@calendar.ai",
      password: "DemoAccount2024!",
      email_confirm: true,
      user_metadata: {
        is_demo: true,
        full_name: "Demo Account"
      }
    })

    if (authError) {
      console.error("Error creating demo auth user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // The profile should be auto-created by the trigger, but let's verify
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error checking profile:", profileError)
    }

    // If profile doesn't exist, create it manually
    if (!profile) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: "demo@calendar.ai",
          full_name: "Demo Account",
          subscription_status: "free",
          subscription_tier: "free",
          trial_used: false,
          onboarding_completed: true,
          ai_queries_used_today: 0,
          ai_queries_reset_date: new Date().toISOString(),
          default_view: "month",
          time_zone: "UTC",
          time_format: "24h",
          week_starts_on: "monday"
        })

      if (insertError) {
        console.error("Error creating profile:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      userId: authData.user.id,
      email: authData.user.email 
    })
  } catch (error) {
    console.error("Error creating demo user:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create demo user" 
    }, { status: 500 })
  }
}
