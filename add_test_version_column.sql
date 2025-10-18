-- SQL to add test_version column to users table
-- Run this in the Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS test_version TEXT DEFAULT '2008';

-- Update any existing users without test_version to use 2008 (for backwards compatibility)
UPDATE users SET test_version = '2008' WHERE test_version IS NULL;

-- Optional: Add an index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_test_version ON users(test_version);
