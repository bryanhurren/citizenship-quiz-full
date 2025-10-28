-- Admin Email Migration
-- Adds email support to admin_users table for daily reports and alerts
-- Run this in Supabase SQL Editor

-- Add email columns to admin_users table
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS receive_alerts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receive_daily_reports BOOLEAN DEFAULT false;

-- Add comment to explain columns
COMMENT ON COLUMN admin_users.email IS 'Admin email address for notifications';
COMMENT ON COLUMN admin_users.receive_alerts IS 'Whether to receive alert emails (errors, issues)';
COMMENT ON COLUMN admin_users.receive_daily_reports IS 'Whether to receive daily report emails';

-- Example: Update your admin account with email
-- UPDATE admin_users
-- SET email = 'your-email@gmail.com',
--     receive_daily_reports = true,
--     receive_alerts = true
-- WHERE username = 'master';
