-- Migration: Add shuffled_question_indices column to users table
-- Date: 2025-10-20
-- Description: Stores the shuffled question order to maintain consistency across sessions
--              This prevents questions from being re-shuffled on session resume

ALTER TABLE users
ADD COLUMN shuffled_question_indices JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.shuffled_question_indices IS 'Array of question indices representing the shuffled order for the current session';
