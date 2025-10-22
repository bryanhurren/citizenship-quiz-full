-- Add access request fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS access_status TEXT DEFAULT 'pending' CHECK (access_status IN ('pending', 'granted', 'denied')),
ADD COLUMN IF NOT EXISTS access_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS access_granted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS access_granted_by TEXT;

-- Update existing users to have 'granted' access (grandfather them in)
UPDATE users
SET access_status = 'granted',
    access_granted_at = created_at
WHERE access_status IS NULL OR access_status = 'pending';
