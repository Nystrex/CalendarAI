import { NextResponse } from "next/server"
import { isGoogleOAuthConfigured, GOOGLE_OAUTH_CONFIG } from "@/lib/google/oauth"

export async function GET() {
  const configured = isGoogleOAuthConfigured()

  return NextResponse.json({
    configured,
    hasClientId: !!GOOGLE_OAUTH_CONFIG.clientId,
    hasClientSecret: !!GOOGLE_OAUTH_CONFIG.clientSecret,
    hasRedirectUri: !!GOOGLE_OAUTH_CONFIG.redirectUri,
    redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri || "NOT SET",
    clientIdPrefix: GOOGLE_OAUTH_CONFIG.clientId ? GOOGLE_OAUTH_CONFIG.clientId.substring(0, 20) + "..." : "NOT SET",
  })
}
