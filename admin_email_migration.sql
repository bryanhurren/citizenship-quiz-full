-- Migration: Add email and notification preferences to admin_users table
-- Date: 2025-10-25
-- Purpose: Enable email-based admin management and alerting system

-- Check if admin_users table exists, if not create it
-- (In case you're using localStorage currently and need to migrate to database)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by TEXT
);

-- Add new columns for email and preferences
-- These will be NULL for existing admins (backward compatible)
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS receive_alerts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receive_daily_reports BOOLEAN DEFAULT false;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Add check constraint to ensure new admins have email
-- (This will be enforced in application logic, not database constraint)

-- Example: Migrate existing localStorage admins to database (run this manually if needed)
-- You'll need to do this from the admin console or via a script
-- INSERT INTO admin_users (username, password, created_at, email, receive_alerts, receive_daily_reports)
-- VALUES
--   ('master', 'PeePeePooPoo2020!', NOW(), NULL, false, false)
-- ON CONFLICT (username) DO NOTHING;

-- Verification query - run this to check the migration worked
-- SELECT username, email, receive_alerts, receive_daily_reports FROM admin_users;
