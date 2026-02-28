import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const adminPassword = request.headers.get("x-admin-password")
  
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    
    if (!botToken) {
      return NextResponse.json({
        status: "error",
        message: "DISCORD_BOT_TOKEN is not set",
      }, { status: 500 })
    }

    // Test the bot token by fetching bot info
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        status: "error",
        message: `Discord API error: ${response.status}`,
        details: errorText,
      }, { status: 500 })
    }

    const botInfo = await response.json()

    return NextResponse.json({
      status: "success",
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        avatar: botInfo.avatar,
      },
      message: "Bot token is valid",
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Exception occurred",
      error: String(error),
    }, { status: 500 })
  }
}
