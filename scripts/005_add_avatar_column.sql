-- Add avatar column to profiles table
ALTER TABLE profiles ADD COLUMN avatar_url text;

-- Create index for faster queries
CREATE INDEX idx_profiles_avatar ON profiles(id);
