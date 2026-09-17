import { createClient } from "@/lib/supabase/server"
import { getGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/google/oauth"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXT_PUBLIC_GOOGLE_REDIRECT_URI environment variables.",
        },
        { status: 503 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate a random state for CSRF protection
    const state = crypto.randomUUID()

    const authUrl = getGoogleAuthUrl(state, request.url)

    const response = NextResponse.json({ url: authUrl })
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    })
    return response
  } catch (error) {
    console.error("[v0] Google OAuth init error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize OAuth" },
      { status: 500 },
    )
  }
}
