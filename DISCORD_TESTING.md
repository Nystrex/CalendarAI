# Discord Bot Testing Guide

## Prerequisites
- You must be logged into CalendarAI
- You must be a member of the Discord server (ID: 1476835132114473044)
- The Discord bot must be in your server with proper permissions

## Test Steps

### 1. Connect Discord Account
1. Go to https://www.calendarai.dev/dashboard
2. Scroll to **Settings** → **Integrations** → **Discord Integration**
3. Click **Connect Discord**
4. You'll be redirected to Discord OAuth
5. Click **Authorize** to grant permissions
6. You should be redirected back to the dashboard with your Discord username displayed

**Expected Result:** Your Discord username and avatar appear in the Discord Integration card

### 2. Enable Discord Notifications
1. In the Discord Integration card, click the **Enabled/Disabled** button next to "Event Notifications"
2. The button should toggle to **Enabled**

**Expected Result:** Button shows "Enabled" state

### 3. Create a Test Event
1. Go to **Dashboard** → **Calendar** (Month or Week view)
2. Click on a date to create a new event
3. Set the event details:
   - **Title:** "Discord Test Event"
   - **Start Time:** 15 minutes from now
   - **End Time:** 30 minutes from now
   - **Description:** "Testing Discord notifications"
4. Save the event

**Expected Result:** Event appears on the calendar

### 4. Wait for Notification
1. Wait up to 15 minutes for the notification to trigger
2. Check your Discord DMs for a message from the bot

**Expected Result:** You receive a Discord DM with:
```
📅 **Event Reminder**

**Discord Test Event**
Testing Discord notifications

⏰ **[Date] at [Time]**
```

## Troubleshooting

### Issue: "Discord client ID not configured"
- The `NEXT_PUBLIC_DISCORD_CLIENT_ID` environment variable is missing
- Check Vercel environment variables

### Issue: "Invalid redirect_uri in request"
- The Discord redirect URI doesn't match what's registered in Discord
- Go to https://discord.com/developers/applications/1476832702568206366/oauth2/general
- Ensure this redirect URI is registered:
  ```
  https://www.calendarai.dev/api/auth/discord/callback
  ```

### Issue: "Failed to fetch Discord user"
- The Discord API is rejecting the access token
- Check Vercel function logs for detailed error
- Verify the bot token is valid and not expired

### Issue: "You're not in the Discord server"
- You must be a member of the Discord server
- Server ID: 1476835132114473044
- Join the server and try again

### Issue: No Discord DM received
- Verify Discord notifications are **Enabled** in settings
- Check that the event start time is within 15 minutes
- The notification system checks every minute
- Check Discord DM settings to ensure the bot can message you

## Testing the Notification API Directly

You can test the notification endpoint directly:

```bash
curl -X POST https://www.calendarai.dev/api/discord/notify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "eventId": "YOUR_EVENT_ID"
  }'
```

## Vercel Logs

To see detailed logs of the Discord integration:

```bash
vercel logs --follow
```

Look for logs starting with `[discord]` to see what's happening during the OAuth flow and notification sending.

## Success Criteria

✅ Discord account connects successfully
✅ Discord username displays in settings
✅ Notifications toggle works
✅ Event created successfully
✅ Discord DM received 15 minutes before event
✅ Notification recorded in database

If all criteria are met, the Discord bot integration is working correctly!
