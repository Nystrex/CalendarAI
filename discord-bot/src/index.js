const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType,
  InteractionType,
} = require('discord.js')

const TOKEN = process.env.DISCORD_BOT_TOKEN
const ACTIVITY = process.env.BOT_ACTIVITY || 'CalendarAI reminders'
const WEBHOOK_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://www.calendarai.dev'
const WEBHOOK_SECRET = process.env.DISCORD_BOT_WEBHOOK_SECRET

if (!TOKEN) {
  console.error('[bot] DISCORD_BOT_TOKEN is not set')
  process.exit(1)
}

if (!WEBHOOK_SECRET) {
  console.error('[bot] DISCORD_BOT_WEBHOOK_SECRET is not set')
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
})

client.once(Events.ClientReady, (c) => {
  console.log(`[bot] Logged in as ${c.user.tag} (id: ${c.user.id})`)
  try {
    c.user.setPresence({
      activities: [{ name: ACTIVITY, type: ActivityType.Watching }],
      status: 'online',
    })
    console.log('[bot] Presence set to online')
  } catch (e) {
    console.warn('[bot] Failed to set presence:', e?.message || e)
  }
})

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.type !== InteractionType.MessageComponent) return
  if (!interaction.isButton()) return

  const customId = interaction.customId
  console.log(`[bot] Button pressed: ${customId}`)

  const parts = customId.split('_')
  const action = parts[0]

  try {
    if (action === 'snooze') {
      const minutes = parseInt(parts[1], 10)
      const userId = parts[2]
      const eventId = parts[3]

      const res = await fetch(`${WEBHOOK_BASE}/api/discord/bot/snooze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ userId, eventId, minutes }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('[bot] Snooze API error:', err)
        await interaction.reply({ content: 'Failed to snooze. Try again later.', ephemeral: true })
        return
      }

      await interaction.reply({ content: `⏰ Snoozed for ${minutes} minutes.`, ephemeral: true })
    } else if (action === 'done') {
      const userId = parts[1]
      const eventId = parts[2]

      const res = await fetch(`${WEBHOOK_BASE}/api/discord/bot/done`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ userId, eventId }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('[bot] Done API error:', err)
        await interaction.reply({ content: 'Failed to mark as done. Try again later.', ephemeral: true })
        return
      }

      await interaction.reply({ content: '✅ Marked as done.', ephemeral: true })
    } else {
      await interaction.reply({ content: 'Unknown action.', ephemeral: true })
    }
  } catch (error) {
    console.error('[bot] Interaction handling error:', error)
    await interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true })
  }
})

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction

  if (commandName === 'ping') {
    await interaction.reply('🏓 Pong! Bot is online.')
  } else if (commandName === 'next') {
    await interaction.reply('Your next event feature coming soon!')
  } else if (commandName === 'notify-on') {
    await interaction.reply('✅ Discord notifications enabled for your account.')
  } else if (commandName === 'notify-off') {
    await interaction.reply('🔕 Discord notifications disabled for your account.')
  }
})

client.on(Events.Error, (err) => {
  console.error('[bot] Client error:', err)
})

setInterval(() => {
  console.log('[bot] heartbeat', new Date().toISOString())
}, 60 * 1000)

const shutdown = async (code = 0) => {
  try {
    console.log('[bot] Shutting down...')
    await client.destroy()
  } catch (e) {
    // ignore
  } finally {
    process.exit(code)
  }
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

client.login(TOKEN).catch((err) => {
  console.error('[bot] Failed to login:', err?.message || err)
  process.exit(1)
})
