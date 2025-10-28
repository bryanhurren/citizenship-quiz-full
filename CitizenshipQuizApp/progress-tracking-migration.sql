-- Progress Tracking Migration
-- Adds columns to track question attempts and correctness across sessions

-- Add progress tracking arrays to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS questions_asked_2008 INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS questions_asked_2025 INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS questions_correct_2008 INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS questions_correct_2025 INTEGER[] DEFAULT '{}';

-- Add study mode to track session type
ALTER TABLE users
ADD COLUMN IF NOT EXISTS study_mode TEXT DEFAULT 'random';

-- Create GIN indexes for efficient array lookups
CREATE INDEX IF NOT EXISTS idx_users_progress_2008_asked ON users USING GIN (questions_asked_2008);
CREATE INDEX IF NOT EXISTS idx_users_progress_2025_asked ON users USING GIN (questions_asked_2025);
CREATE INDEX IF NOT EXISTS idx_users_progress_2008_correct ON users USING GIN (questions_correct_2008);
CREATE INDEX IF NOT EXISTS idx_users_progress_2025_correct ON users USING GIN (questions_correct_2025);

-- Comments for documentation
COMMENT ON COLUMN users.questions_asked_2008 IS 'Array of question indices from 2008 test that user has attempted (0-99)';
COMMENT ON COLUMN users.questions_asked_2025 IS 'Array of question indices from 2025 test that user has attempted (0-127)';
COMMENT ON COLUMN users.questions_correct_2008 IS 'Array of question indices from 2008 test that user answered correctly';
COMMENT ON COLUMN users.questions_correct_2025 IS 'Array of question indices from 2025 test that user answered correctly';
COMMENT ON COLUMN users.study_mode IS 'Current study mode: random or focused';
