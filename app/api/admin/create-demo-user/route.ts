import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Only admin can create demo user
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()

    console.log("[v0] Creating demo user - checking if already exists...")

    // First check if demo user already exists by listing users
    const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      console.log("[v0] Error listing users:", listError.message)
    }

    const existingDemo = existingUsers?.users?.find((u) => u.email === "demo@calendar.ai")

    if (existingDemo) {
      console.log("[v0] Demo user already exists, deleting first:", existingDemo.id)
      // Delete existing profile first (foreign key)
      await adminClient.from("profiles").delete().eq("id", existingDemo.id)
      // Delete calendars and events for demo user
      await adminClient.from("events").delete().eq("user_id", existingDemo.id)
      await adminClient.from("calendars").delete().eq("user_id", existingDemo.id)
      // Delete the auth user
      await adminClient.auth.admin.deleteUser(existingDemo.id)
      console.log("[v0] Old demo user deleted")
    }

    // Create fresh demo user
    console.log("[v0] Creating new demo user...")
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: "demo@calendar.ai",
      password: "DemoAccount2024!",
      email_confirm: true,
      user_metadata: {
        is_demo: true,
        full_name: "Demo Account"
      }
    })

    if (authError) {
      console.log("[v0] Error creating demo auth user:", authError.message)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    console.log("[v0] Demo auth user created:", authData.user.id)

    // Wait briefly for trigger to create profile
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if profile was auto-created by trigger
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single()

    // If profile doesn't exist, create it manually
    if (!profile) {
      console.log("[v0] Profile not auto-created, inserting manually...")
      const { error: insertError } = await adminClient
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
        console.log("[v0] Error creating profile:", insertError.message)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      console.log("[v0] Profile created manually")
    } else {
      console.log("[v0] Profile auto-created by trigger")
    }

    console.log("[v0] Demo account ready!")
    return NextResponse.json({ 
      success: true, 
      userId: authData.user.id,
      email: authData.user.email 
    })
  } catch (error) {
    console.log("[v0] Unexpected error creating demo user:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create demo user" 
    }, { status: 500 })
  }
}
