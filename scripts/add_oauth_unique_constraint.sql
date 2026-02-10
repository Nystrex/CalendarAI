-- Migration: Add unique constraint for active OAuth connections
-- This prevents multiple users from syncing the same Gmail account
-- When a user disconnects (is_active = false), the constraint allows a new user to sync that Gmail

BEGIN;

-- Add a unique constraint for active Google OAuth connections
-- This uses a partial index to only apply the constraint when is_active = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_connections_active_google_unique
  ON oauth_connections (provider_account_id)
  WHERE provider = 'google' AND is_active = true;

COMMIT;
