-- Migration: Remove automatic trial granting and add manual claim system
-- This resets all trialing users back to free tier so they can manually claim

-- Reset all trialing users to free tier
UPDATE profiles 
SET 
  subscription_tier = 'free',
  subscription_status = 'inactive',
  trial_used = false,
  trial_ends_at = null,
  updated_at = NOW()
WHERE subscription_status = 'trialing';

-- Drop the old trigger that auto-grants trials
DROP TRIGGER IF EXISTS grant_trial_on_signup ON profiles;
DROP FUNCTION IF EXISTS grant_trial_to_new_user();

-- The trial_used and trial_ends_at columns remain for when users manually claim
COMMENT ON COLUMN profiles.trial_used IS 'Whether the user has claimed and used their 14-day free trial';
COMMENT ON COLUMN profiles.trial_ends_at IS 'When the free trial expires (null if not claimed or trial expired)';
