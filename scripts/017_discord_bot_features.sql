-- Discord bot feature settings and per-event notification state

-- Stores global Discord bot configuration (singleton row)
CREATE TABLE IF NOT EXISTS discord_bot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00',
  quiet_hours_end TIME NOT NULL DEFAULT '07:00',
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  weekly_digest_day SMALLINT NOT NULL DEFAULT 1, -- 0=Sun ... 6=Sat (default Mon)
  weekly_digest_time TIME NOT NULL DEFAULT '09:00',
  announcement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  announcement_channel_id TEXT NULL,
  announcement_role_ids TEXT[] NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure there is always exactly one row
CREATE UNIQUE INDEX IF NOT EXISTS discord_bot_settings_singleton_idx ON discord_bot_settings ((TRUE));

-- Tracks notification state per user + event (snooze/done)
CREATE TABLE IF NOT EXISTS discord_notification_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMP NULL,
  dismissed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_notification_state_user_id ON discord_notification_state(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_notification_state_event_id ON discord_notification_state(event_id);

-- Bucket for admin-uploaded assets used in Discord messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('discord-assets', 'discord-assets', false)
ON CONFLICT (id) DO NOTHING;
