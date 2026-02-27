-- Add per-item weight to school_items
-- When set, this overrides the category pool weighting for that specific item

ALTER TABLE school_items
  ADD COLUMN IF NOT EXISTS weight_percent NUMERIC CHECK (weight_percent >= 0 AND weight_percent <= 100);
