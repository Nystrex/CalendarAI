-- Add calendar preferences to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_view text DEFAULT 'month',
ADD COLUMN IF NOT EXISTS week_starts_on text DEFAULT 'sunday',
ADD COLUMN IF NOT EXISTS time_format text DEFAULT '12';

COMMENT ON COLUMN profiles.default_view IS 'User preferred calendar view: month, week, day';
COMMENT ON COLUMN profiles.week_starts_on IS 'First day of week: sunday or monday';
COMMENT ON COLUMN profiles.time_format IS 'Time display format: 12 or 24';
