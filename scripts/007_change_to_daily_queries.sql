-- Change AI queries from monthly to daily tracking
ALTER TABLE profiles 
  RENAME COLUMN ai_queries_used_this_month TO ai_queries_used_today;

-- Update all existing users to reset today
UPDATE profiles 
SET ai_queries_used_today = 0,
    ai_queries_reset_date = NOW();

COMMENT ON COLUMN profiles.ai_queries_used_today IS 'Number of AI queries used today (resets daily)';
COMMENT ON COLUMN profiles.ai_queries_reset_date IS 'Date when AI query counter was last reset';
