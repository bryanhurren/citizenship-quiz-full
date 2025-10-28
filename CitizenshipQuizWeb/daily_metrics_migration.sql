-- Daily Metrics Migration
-- Creates table to track daily application metrics
-- Run this in Supabase SQL Editor

-- Create daily_metrics table
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  new_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  revenue_usd DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE daily_metrics IS 'Daily application metrics for monitoring and reporting';

-- Add comments to columns
COMMENT ON COLUMN daily_metrics.date IS 'Date of metrics (YYYY-MM-DD)';
COMMENT ON COLUMN daily_metrics.new_users IS 'New users created on this date';
COMMENT ON COLUMN daily_metrics.total_users IS 'Total users in system on this date';
COMMENT ON COLUMN daily_metrics.active_users IS 'Users who logged in on this date';
COMMENT ON COLUMN daily_metrics.new_subscriptions IS 'New premium subscriptions started on this date';
COMMENT ON COLUMN daily_metrics.active_subscriptions IS 'Total active subscriptions on this date';
COMMENT ON COLUMN daily_metrics.revenue_usd IS 'Revenue generated on this date (in USD)';

-- Create index on date for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_daily_metrics_updated_at ON daily_metrics;
CREATE TRIGGER trigger_update_daily_metrics_updated_at
BEFORE UPDATE ON daily_metrics
FOR EACH ROW
EXECUTE FUNCTION update_daily_metrics_updated_at();
