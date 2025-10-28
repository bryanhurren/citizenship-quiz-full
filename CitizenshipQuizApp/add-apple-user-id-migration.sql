-- Migration: Add apple_user_id column to users table
-- This enables proper Apple Sign-In authentication using stable user identifiers

-- Add the apple_user_id column (nullable to support existing users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS apple_user_id TEXT;

-- Create an index on apple_user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_apple_user_id ON users(apple_user_id);

-- Add a comment explaining the column
COMMENT ON COLUMN users.apple_user_id IS 'Apple Sign-In user identifier - stable across sessions, used for authentication';
