-- Add recurrence fields to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,         -- 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'weekdays'
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,     -- last occurrence (inclusive), NULL = no end
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Index for quickly finding all instances of a recurring series
CREATE INDEX IF NOT EXISTS idx_events_recurrence_parent ON events(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;
