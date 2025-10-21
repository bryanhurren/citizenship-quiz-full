-- Migration: Add session_status column to users table
-- Date: 2025-10-20
-- Description: Adds session_status column to track whether a user has an active quiz session
--              Possible values: NULL (no session), 'in_progress' (active session)

ALTER TABLE users
ADD COLUMN session_status TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.session_status IS 'Tracks quiz session status: NULL = no session, in_progress = active session';
