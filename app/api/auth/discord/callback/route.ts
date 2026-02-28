import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
const DISCORD_CLIENT_SECRET = process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET
const DISCORD_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`

interface DiscordUser {
  id: string
  username: string
  avatar: string | null
  email: string
}

async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "CalendarAI/1.0",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[discord] Failed to fetch user:", response.status, errorText)
      throw new Error(`Discord API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log("[discord] User fetched successfully:", data.id, data.username)
    return data
  } catch (error) {
    console.error("[discord] getDiscordUser error:", error)
    throw error
  }
}

async function checkDiscordServerMembership(userId: string, accessToken: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID
  if (!guildId) return true // Skip check if guild ID not configured

  try {
    const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return response.ok
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      console.error("[discord] Missing Discord credentials in environment")
      return NextResponse.redirect(
        new URL("/dashboard?discord_error=config_missing", request.nextUrl.origin)
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard?discord_error=no_code", request.nextUrl.origin)
      )
    }

    // Exchange code for access token
    const tokenBody = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: DISCORD_REDIRECT_URI,
    })

    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("[discord] Token exchange failed:", tokenResponse.status, errorData)
      return NextResponse.redirect(
        new URL(`/dashboard?discord_error=token_exchange_failed&details=${encodeURIComponent(errorData)}`, request.nextUrl.origin)
      )
    }

    const tokenData = await tokenResponse.json()
    console.log("[discord] Token response:", JSON.stringify(tokenData))
    
    const { access_token, refresh_token, token_type } = tokenData

    if (!access_token) {
      console.error("[discord] No access token in response:", tokenData)
      return NextResponse.redirect(
        new URL(`/dashboard?discord_error=no_access_token`, request.nextUrl.origin)
      )
    }

    console.log("[discord] Token exchange successful, token_type:", token_type, "fetching user info")
    
    // Get Discord user info
    let discordUser
    try {
      discordUser = await getDiscordUser(access_token)
    } catch (error) {
      console.error("[discord] Error fetching user:", error)
      return NextResponse.redirect(
        new URL(`/dashboard?discord_error=fetch_user_failed&details=${encodeURIComponent(String(error))}`, request.nextUrl.origin)
      )
    }

    // Check if user is in the Discord server
    const isMember = await checkDiscordServerMembership(discordUser.id, access_token)

    if (!isMember) {
      return NextResponse.redirect(
        new URL(
          `/dashboard?discord_error=not_in_server&discord_username=${encodeURIComponent(discordUser.username)}`,
          request.nextUrl.origin
        )
      )
    }

    // Get current authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.nextUrl.origin))
    }

    // Store Discord info in profiles table
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null

    const { error } = await supabase
      .from("profiles")
      .update({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_avatar_url: avatarUrl,
        discord_access_token: access_token,
        discord_refresh_token: refresh_token,
        discord_notifications_enabled: true,
        discord_connected_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to save Discord connection" }, { status: 500 })
    }

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      new URL(`/dashboard?discord_connected=true&discord_username=${encodeURIComponent(discordUser.username)}`, request.nextUrl.origin)
    )
  } catch (error) {
    console.error("[discord] callback error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
