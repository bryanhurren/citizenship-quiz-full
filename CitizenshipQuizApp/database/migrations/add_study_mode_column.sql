-- Add study_mode column to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS study_mode TEXT CHECK (study_mode IN ('random', 'focused'));

-- Add comment
COMMENT ON COLUMN sessions.study_mode IS 'Type of study mode: random (full test) or focused (practice incorrect questions)';

-- Set default value for existing rows (if any)
UPDATE sessions SET study_mode = 'random' WHERE study_mode IS NULL;
