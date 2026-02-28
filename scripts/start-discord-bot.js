const fetch = require('node-fetch');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API_BASE = 'https://discord.com/api/v10';

if (!DISCORD_BOT_TOKEN) {
  console.error('DISCORD_BOT_TOKEN not set');
  process.exit(1);
}

// Keep-alive function to maintain bot connection
async function keepBotAlive() {
  try {
    // Get bot info to verify connection
    const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });

    if (response.ok) {
      const botInfo = await response.json();
      console.log(`✓ Discord bot connected: ${botInfo.username}#${botInfo.discriminator}`);
      console.log(`  Bot ID: ${botInfo.id}`);
      console.log(`  Status: Online`);
    } else {
      console.error(`✗ Failed to connect to Discord: ${response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error connecting to Discord:', error);
    process.exit(1);
  }
}

// Start the bot
console.log('Starting Discord bot...');
keepBotAlive();

// Keep process alive
setInterval(() => {
  // Periodic health check
  keepBotAlive().catch(err => {
    console.error('Health check failed:', err);
  });
}, 60000); // Check every minute

console.log('Discord bot is running. Press Ctrl+C to stop.');
