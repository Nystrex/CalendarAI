-- Add is_visible column to calendars table to allow hiding synced calendars
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_calendars_user_visible ON calendars(user_id, is_visible);
