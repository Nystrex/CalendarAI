const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_API_BASE = "https://discord.com/api/v10"

export async function sendDiscordNotification(
  discordId: string,
  title: string,
  description: string,
  eventTime: Date,
  eventId?: string,
  userId?: string
): Promise<boolean> {
  try {
    if (!DISCORD_TOKEN) {
      console.error("[Discord] Bot token not configured")
      return false
    }

    const unix = Math.floor(eventTime.getTime() / 1000)
    const content = `⏰ Reminder <t:${unix}:R>`
    const embed = {
      title: "Event Reminder",
      description: [`**${title}**`, (description || "").trim()].filter(Boolean).join("\n\n"),
      color: 0x5865f2,
      fields: [
        {
          name: "When",
          value: `<t:${unix}:F> (<t:${unix}:R>)`,
        },
      ],
    }

    // Build components (buttons) if we have eventId and userId
    const components: any[] = []
    if (eventId && userId) {
      components.push({
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 5, // Link
            label: "Open in CalendarAI",
            url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?eventId=${eventId}`,
          },
          {
            type: 2,
            style: 2, // Secondary
            label: "Snooze 5m",
            custom_id: `snooze_5_${userId}_${eventId}`,
          },
          {
            type: 2,
            style: 2,
            label: "Snooze 10m",
            custom_id: `snooze_10_${userId}_${eventId}`,
          },
          {
            type: 2,
            style: 2,
            label: "Snooze 30m",
            custom_id: `snooze_30_${userId}_${eventId}`,
          },
          {
            type: 2,
            style: 3, // Success
            label: "Mark Done",
            custom_id: `done_${userId}_${eventId}`,
          },
        ],
      })
    }

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
    const messagePayload: any = { content, embeds: [embed] }
    if (components.length > 0) {
      messagePayload.components = components
    }

    const messageResponse = await fetch(`${DISCORD_API_BASE}/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
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
