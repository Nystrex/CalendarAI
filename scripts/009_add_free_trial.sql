-- Add free trial tracking to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN profiles.trial_used IS 'Whether user has already used their free trial';
COMMENT ON COLUMN profiles.trial_ends_at IS 'When the free trial period ends';

-- Function to automatically grant trial on signup
CREATE OR REPLACE FUNCTION grant_trial_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Grant 14-day trial to new users
  IF NEW.trial_used = FALSE OR NEW.trial_used IS NULL THEN
    NEW.trial_used := TRUE;
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
    NEW.subscription_tier := 'premium';
    NEW.subscription_status := 'trialing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS trigger_grant_trial ON profiles;
CREATE TRIGGER trigger_grant_trial
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION grant_trial_on_signup();

-- Update existing users who haven't used trial yet (optional - for testing)
-- Uncomment if you want to give existing users a trial
-- UPDATE profiles 
-- SET trial_used = TRUE,
--     trial_ends_at = NOW() + INTERVAL '14 days',
--     subscription_tier = 'premium',
--     subscription_status = 'trialing'
-- WHERE trial_used = FALSE OR trial_used IS NULL;
