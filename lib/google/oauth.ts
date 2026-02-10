export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "",
  scopes: [
    "https://www.googleapis.com/auth/calendar", // Full calendar access (replaces readonly and events)
    "https://www.googleapis.com/auth/userinfo.email",
  ],
}

export function isGoogleOAuthConfigured(): boolean {
  return !!(GOOGLE_OAUTH_CONFIG.clientId && GOOGLE_OAUTH_CONFIG.clientSecret && GOOGLE_OAUTH_CONFIG.redirectUri)
}

export function getRedirectUri(requestUrl?: string): string {
  if (GOOGLE_OAUTH_CONFIG.redirectUri) {
    return GOOGLE_OAUTH_CONFIG.redirectUri
  }

  // Always use main domain for OAuth redirects
  return "https://calendarai.dev/api/auth/google/callback"
}

export function getGoogleAuthUrl(state: string, requestUrl?: string): string {
  const redirectUri = getRedirectUri(requestUrl)

  if (!GOOGLE_OAUTH_CONFIG.clientId || !redirectUri) {
    throw new Error(
      "Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_REDIRECT_URI",
    )
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, requestUrl?: string) {
  const redirectUri = getRedirectUri(requestUrl)

  if (!GOOGLE_OAUTH_CONFIG.clientId || !GOOGLE_OAUTH_CONFIG.clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens")
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken: string) {
  if (!GOOGLE_OAUTH_CONFIG.clientId || !GOOGLE_OAUTH_CONFIG.clientSecret) {
    throw new Error("Google OAuth is not configured")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh access token")
  }

  return response.json()
}
