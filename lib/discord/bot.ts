const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_API_BASE = "https://discord.com/api/v10"

export async function sendDiscordNotification(
  discordId: string,
  title: string,
  description: string,
  eventTime: Date
): Promise<boolean> {
  try {
    if (!DISCORD_TOKEN) {
      console.error("[Discord] Bot token not configured")
      return false
    }

    const timeStr = eventTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const dateStr = eventTime.toLocaleDateString()

    const message = `📅 **Event Reminder**\n\n**${title}**\n${description || ""}\n\n⏰ **${dateStr} at ${timeStr}**`

    console.log(`[Discord] Attempting to send DM to user ${discordId}`)

    // Send DM via Discord API
    const response = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordId }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Discord] Failed to create DM channel: ${response.status}`, errorText)
      return false
    }

    const dmChannel = await response.json()
    console.log(`[Discord] DM channel created: ${dmChannel.id}`)

    // Send message to DM channel
    const messageResponse = await fetch(`${DISCORD_API_BASE}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
    })

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error(`[Discord] Failed to send message: ${messageResponse.status}`, errorText)
      return false
    }

    console.log(`[Discord] Message sent successfully to ${discordId}`)
    return true
  } catch (error) {
    console.error("[Discord] Failed to send notification:", error)
    return false
  }
}

export function getDiscordOAuthUrl(): string {
  const clientId = process.env.DISCORD_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`
  const scopes = ["identify", "email", "guilds.members.read"]

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
  })

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`
}
