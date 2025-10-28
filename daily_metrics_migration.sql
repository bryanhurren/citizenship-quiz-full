-- Migration: Create daily_metrics table for tracking app usage and performance
-- Date: 2025-10-25
-- Purpose: Enable daily operational reports and metrics tracking

CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,

  -- User metrics
  new_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0, -- users who logged in that day

  -- Authentication metrics
  login_attempts INTEGER DEFAULT 0,
  login_successes INTEGER DEFAULT 0,
  login_failures INTEGER DEFAULT 0,

  -- Quiz metrics
  quiz_sessions INTEGER DEFAULT 0,
  quiz_completions INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,

  -- API metrics
  api_calls INTEGER DEFAULT 0,
  api_errors INTEGER DEFAULT 0,

  -- Revenue metrics
  new_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  canceled_subscriptions INTEGER DEFAULT 0,
  revenue_usd DECIMAL(10, 2) DEFAULT 0.00,

  -- Performance metrics
  avg_response_time_ms INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_created_at ON daily_metrics(created_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
DROP TRIGGER IF EXISTS daily_metrics_updated_at_trigger ON daily_metrics;
CREATE TRIGGER daily_metrics_updated_at_trigger
  BEFORE UPDATE ON daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_metrics_updated_at();

-- Verification query
-- SELECT * FROM daily_metrics ORDER BY date DESC LIMIT 7;
