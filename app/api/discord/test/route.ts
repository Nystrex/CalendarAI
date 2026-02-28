import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get("token")

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 400 })
  }

  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      data,
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    }, { status: 500 })
  }
}
