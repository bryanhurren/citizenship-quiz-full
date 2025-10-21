-- Create sessions table to store completed quiz sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_version TEXT NOT NULL CHECK (test_version IN ('2008', '2025')),
  mode TEXT NOT NULL CHECK (mode IN ('formal', 'comedy')),
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  total_questions_asked INTEGER NOT NULL DEFAULT 0,
  session_status TEXT NOT NULL CHECK (session_status IN ('passed', 'failed')),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  question_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at DESC);

-- Add comment to table
COMMENT ON TABLE sessions IS 'Stores completed citizenship quiz sessions for each user';
COMMENT ON COLUMN sessions.total_questions_asked IS 'Actual number of questions asked (may be less than max if early termination)';
COMMENT ON COLUMN sessions.question_results IS 'JSON array of question/answer/feedback data';
