import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Early return if OAuth not configured
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.redirect(new URL("/dashboard/settings?error=oauth_not_configured", request.nextUrl.origin))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(new URL(`/dashboard/settings?error=${error}`, request.nextUrl.origin))
    }

    // Check for authorization code
    if (!code) {
      return NextResponse.redirect(new URL("/dashboard/settings?error=no_code", request.nextUrl.origin))
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(new URL("/auth/login", request.nextUrl.origin))
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, request.url)

    // Get user info from Google
    const googleAPI = new GoogleCalendarAPI(tokens.access_token)
    const userInfo = await googleAPI.getUserInfo()
    // Update user metadata with profile picture
    if (userInfo.picture) {
      await supabase.auth.updateUser({
        data: {
          avatar_url: userInfo.picture,
        },
      })
    }

    // Calculate token expiry
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    // Store OAuth connection
    const { error: dbError } = await supabase.from("oauth_connections").upsert(
      {
        user_id: user.id,
        provider: "google",
        provider_account_id: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
        is_active: true,
      },
      {
        onConflict: "user_id,provider,provider_account_id",
      },
    )

    if (dbError) {
      console.error("Database error:", dbError)
      
      // Check if error is due to unique constraint violation (Gmail already synced by another user)
      if (dbError.code === "23505" || dbError.message?.includes("unique constraint")) {
        return NextResponse.redirect(
          new URL(
            `/dashboard/settings?error=${encodeURIComponent("This Gmail account is already connected to another account. Please disconnect it there first.")}`,
            request.nextUrl.origin,
          ),
        )
      }
      
      return NextResponse.redirect(new URL("/dashboard/settings?error=database_error", request.nextUrl.origin))
    }

    // Success - redirect to settings
    return NextResponse.redirect(new URL("/dashboard/settings?google_connected=true", request.nextUrl.origin))
  } catch (error) {
    console.error("Fatal OAuth callback error:", error)

    try {
      // Try to redirect gracefully
      const errorMessage = error instanceof Error ? error.message : "oauth_failed"
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${encodeURIComponent(errorMessage)}`, request.nextUrl.origin),
      )
    } catch (redirectError) {
      // If even redirect fails, return a JSON error response
      console.error("Redirect failed:", redirectError)
      return NextResponse.json(
        { error: "OAuth callback failed", details: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  }
}
