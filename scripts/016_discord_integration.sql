-- Add Discord integration columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_notifications_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_connected_at TIMESTAMP;

-- Create discord_notifications table for tracking notification preferences
CREATE TABLE IF NOT EXISTS discord_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_notifications_user_id ON discord_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_notifications_event_id ON discord_notifications(event_id);
