# Discord Bot Setup Guide

## Step 1: Add Environment Variables to Vercel

Go to: https://vercel.com/dashboard → Select **calendar-ai** → **Settings** → **Environment Variables**

Add these variables (make sure to select "Production" environment):

```
NEXT_PUBLIC_DISCORD_CLIENT_ID = 1476832702568206366
DISCORD_CLIENT_SECRET = 9ju7syqhfQZFpdCoLF0Nk_E1DQ3VKTpo
DISCORD_BOT_TOKEN = MTQ3NjgzMjcwMjU2ODIwNjM2Ng.GiZnW1.ru41AJ6LsHr3QmhHSlD5kxrPWk_tgNU3LRimak
DISCORD_GUILD_ID = 1476835132114473044
```

## Step 2: Redeploy

After adding variables, redeploy:
```bash
vercel --prod
```

## Step 3: Test the Discord Connection

1. Go to https://www.calendarai.dev/dashboard
2. Scroll to **Settings** → **Integrations** → **Discord Integration**
3. Click **Connect Discord**
4. You should be redirected to Discord OAuth
5. Authorize the app
6. You'll be redirected back with your Discord username

## Step 4: Enable Notifications

Once connected, toggle **Event Notifications** to enable Discord DM reminders.

## Troubleshooting

If you see `discord_error=config_missing`:
- Verify all 4 environment variables are added to Vercel
- Check that variables are set for "Production" environment
- Redeploy with `vercel --prod`

If you see `discord_error=not_in_server`:
- Make sure you're a member of the Discord server (ID: 1476835132114473044)
- The bot needs to be in the server with proper permissions

## Security Note

⚠️ The credentials above are now exposed. Regenerate them:
1. Bot Token: https://discord.com/developers/applications/1476832702568206366/bot → Regenerate
2. Client Secret: https://discord.com/developers/applications/1476832702568206366/oauth2/general → Regenerate
