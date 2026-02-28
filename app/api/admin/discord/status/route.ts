import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get("x-admin-password")
    
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    const guildId = process.env.DISCORD_GUILD_ID

    if (!botToken || !clientId || !guildId) {
      return NextResponse.json({
        status: "error",
        message: "Missing Discord configuration",
        configured: {
          bot_token: !!botToken,
          client_id: !!clientId,
          guild_id: !!guildId,
        },
      })
    }

    // Test bot connection
    const botResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    })

    if (!botResponse.ok) {
      return NextResponse.json({
        status: "error",
        message: "Bot token is invalid or expired",
        bot_status: botResponse.status,
        details: await botResponse.text(),
      })
    }

    const botInfo = await botResponse.json()

    // Check if bot is in the guild
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${botInfo.id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    )

    const inGuild = guildResponse.ok

    return NextResponse.json({
      status: "success",
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        discriminator: botInfo.discriminator,
        avatar: botInfo.avatar,
      },
      guild: {
        id: guildId,
        bot_is_member: inGuild,
      },
      message: inGuild
        ? "Bot is configured and in the server. It can send messages via API."
        : "Bot token is valid but bot is NOT in the Discord server. Add it first.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
