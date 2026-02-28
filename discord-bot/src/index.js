const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType,
} = require('discord.js')

const TOKEN = process.env.DISCORD_BOT_TOKEN
const ACTIVITY = process.env.BOT_ACTIVITY || 'CalendarAI reminders'

if (!TOKEN) {
  console.error('[bot] DISCORD_BOT_TOKEN is not set')
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel], // needed for DMs
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

client.on(Events.Error, (err) => {
  console.error('[bot] Client error:', err)
})

// Optional: simple health heartbeat
setInterval(() => {
  console.log('[bot] heartbeat', new Date().toISOString())
}, 60 * 1000)

// Graceful shutdown
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
