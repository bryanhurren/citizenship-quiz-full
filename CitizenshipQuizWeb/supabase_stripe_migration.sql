-- Migration to add Stripe-related columns to the users table
-- Run this in your Supabase SQL Editor

-- Add Stripe customer ID column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add Stripe subscription ID column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
ON users(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
ON users(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for subscription management';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID for the current active subscription';
