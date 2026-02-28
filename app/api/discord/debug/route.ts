import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    
    if (!botToken) {
      return NextResponse.json({
        status: "error",
        message: "DISCORD_BOT_TOKEN is not set in environment variables",
      })
    }

    // Test the bot token
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json({
        status: "error",
        message: `Discord API returned ${response.status}`,
        details: responseText,
        token_preview: botToken.substring(0, 10) + "...",
      })
    }

    const botInfo = JSON.parse(responseText)

    return NextResponse.json({
      status: "success",
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        discriminator: botInfo.discriminator,
      },
      message: "Bot token is valid!",
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Exception occurred",
      error: String(error),
    }, { status: 500 })
  }
}
