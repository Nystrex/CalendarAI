import { type NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || ""
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://calendarai.dev"
  const appHostname = new URL(appUrl).hostname

  // Skip redirection if in a preview environment
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    console.log("[CalendarAI] Skipping redirect in preview environment.")
    return NextResponse.next()
  }

  // Redirect from Vercel subdomain to main domain
  if (
    (host.includes("v0-calendar-web-application-13111-omega.vercel.app") ||
    host.includes("vercel.app")) && 
    host !== appHostname &&
    !host.includes("localhost") &&
    !host.includes("0.0.0.0")
  ) {
    const url = new URL(request.url)
    url.hostname = appHostname
    url.protocol = protocol
    console.log(`[CalendarAI] Redirecting from ${host} to main domain:`, url.toString())
    return NextResponse.redirect(url, { status: 301 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
