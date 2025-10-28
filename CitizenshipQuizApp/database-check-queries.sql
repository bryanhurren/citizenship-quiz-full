-- Database Integrity Checks for Premium User Issue
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- 1. Check for users with 'premium' tier but missing/null expiration date
SELECT
  id,
  username,
  subscription_tier,
  subscription_expires_at,
  questions_answered_today,
  questions_reset_at,
  created_at
FROM users
WHERE subscription_tier = 'premium'
  AND subscription_expires_at IS NULL;

-- 2. Check for users with expired premium subscriptions
SELECT
  id,
  username,
  subscription_tier,
  subscription_expires_at,
  questions_answered_today,
  questions_reset_at,
  created_at
FROM users
WHERE subscription_tier = 'premium'
  AND subscription_expires_at < NOW();

-- 3. Check for users missing subscription_tier field (should default to 'free')
SELECT
  id,
  username,
  subscription_tier,
  subscription_expires_at,
  questions_answered_today,
  questions_reset_at,
  created_at
FROM users
WHERE subscription_tier IS NULL;

-- 4. Check for users with daily counter issues
SELECT
  id,
  username,
  subscription_tier,
  subscription_expires_at,
  questions_answered_today,
  questions_reset_at,
  created_at
FROM users
WHERE questions_answered_today IS NULL
   OR questions_reset_at IS NULL;

-- 5. Get all premium users to see their full state
SELECT
  id,
  username,
  subscription_tier,
  subscription_expires_at,
  questions_answered_today,
  questions_reset_at,
  created_at
FROM users
WHERE subscription_tier = 'premium'
ORDER BY created_at DESC;

-- 6. Fix query: Update users with NULL questions_answered_today
-- (Run this ONLY if query #4 shows NULL values)
/*
UPDATE users
SET
  questions_answered_today = 0,
  questions_reset_at = NOW()
WHERE questions_answered_today IS NULL
   OR questions_reset_at IS NULL;
*/

-- 7. Check schema to ensure all required columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'subscription_tier',
    'subscription_expires_at',
    'questions_answered_today',
    'questions_reset_at'
  )
ORDER BY column_name;
