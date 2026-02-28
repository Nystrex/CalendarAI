import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Test endpoint to verify Discord integration setup
 * GET /api/discord/test-connection
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        status: "error",
        message: "Not authenticated",
        details: authError?.message,
      }, { status: 401 })
    }

    // Get user's Discord profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("discord_id, discord_username, discord_notifications_enabled, discord_connected_at")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({
        status: "error",
        message: "Failed to fetch profile",
        details: profileError.message,
      }, { status: 500 })
    }

    // Check environment variables
    const envVars = {
      NEXT_PUBLIC_DISCORD_CLIENT_ID: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      NEXT_PUBLIC_DISCORD_CLIENT_SECRET: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET,
      DISCORD_BOT_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
      DISCORD_GUILD_ID: !!process.env.DISCORD_GUILD_ID,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    }

    return NextResponse.json({
      status: "success",
      user: {
        id: user.id,
        email: user.email,
      },
      discord: {
        connected: !!profile?.discord_id,
        discord_id: profile?.discord_id || null,
        discord_username: profile?.discord_username || null,
        notifications_enabled: profile?.discord_notifications_enabled || false,
        connected_at: profile?.discord_connected_at || null,
      },
      environment: envVars,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`,
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Internal server error",
      details: String(error),
    }, { status: 500 })
  }
}
