-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_queries_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_queries_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Create subscription_history table for tracking changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  stripe_subscription_id TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_history
CREATE POLICY "Users can view their own subscription history"
  ON subscription_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert subscription history"
  ON subscription_history
  FOR INSERT
  WITH CHECK (true);

-- Create function to reset AI query counts monthly
CREATE OR REPLACE FUNCTION reset_ai_query_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET 
    ai_queries_used_this_month = 0,
    ai_queries_reset_date = NOW()
  WHERE ai_queries_reset_date < NOW() - INTERVAL '1 month';
END;
$$;
