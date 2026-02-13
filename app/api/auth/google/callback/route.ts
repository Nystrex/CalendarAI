// Handles the OAuth callback from Google
import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { GoogleCalendarAPI } from "@/lib/google/calendar-api"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.redirect(new URL("/dashboard?error=oauth_not_configured", request.nextUrl.origin))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(new URL(`/dashboard?error=${error}`, request.nextUrl.origin))
    }

    if (!code) {
      return NextResponse.redirect(new URL("/dashboard?error=no_code", request.nextUrl.origin))
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(new URL("/auth/login", request.nextUrl.origin))
    }

    const tokens = await exchangeCodeForTokens(code, request.url)
    const googleAPI = new GoogleCalendarAPI(tokens.access_token)
    const userInfo = await googleAPI.getUserInfo()

    if (userInfo.picture) {
      await supabase.auth.updateUser({
        data: {
          avatar_url: userInfo.picture,
        },
      })
    }

    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in)

    const connectionData = {
      user_id: user.id,
      provider: "google" as const,
      provider_account_id: userInfo.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      scope: tokens.scope,
      is_active: true,
    };

    const { data: existingConnection } = await supabase
      .from("oauth_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    let dbError;
    if (existingConnection) {
      const { error } = await supabase
        .from("oauth_connections")
        .update(connectionData)
        .eq("id", existingConnection.id);
      dbError = error;
    } else {
      const { error } = await supabase
        .from("oauth_connections")
        .insert(connectionData);
      dbError = error;
    }

    if (dbError) {
      console.error("Database error saving oauth connection:", dbError)
      return NextResponse.redirect(new URL("/dashboard?error=database_error", request.nextUrl.origin))
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_used, subscription_status")
      .eq("id", user.id)
      .single();

    if (profile && !profile.trial_used && profile.subscription_status !== 'active') {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      await supabase
        .from("profiles")
        .update({
          trial_used: true,
          trial_ends_at: trialEnds.toISOString(),
          subscription_status: 'trialing'
        })
        .eq("id", user.id);
    }

    return NextResponse.redirect(new URL("/dashboard?google_connected=true", request.nextUrl.origin))
  } catch (error) {
    console.error("Fatal OAuth callback error:", error)
    const errorMessage = error instanceof Error ? error.message : "oauth_failed"
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(errorMessage)}`, request.nextUrl.origin),
    )
  }
}
