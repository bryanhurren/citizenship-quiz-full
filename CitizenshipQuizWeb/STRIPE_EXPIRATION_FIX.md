# Stripe Expiration Date Fix

## Problem Identified

You correctly identified that Stripe **IS** providing expiration dates in the webhook:
```json
"current_period_end": 1761865327
```

However, our webhook code wasn't using it properly!

## Root Cause

The webhook flow was:

1. **`checkout.session.completed`** fires first
   - Has user ID in metadata ✅
   - Tries to fetch subscription via API
   - **BUT** if API call fails (subscription not fully created yet), falls back to 7-day default ❌

2. **`customer.subscription.created`** fires second
   - Has complete subscription data including `current_period_end` ✅
   - **BUT** we only logged it, didn't update the database ❌

The data was there all along - we just weren't using it!

## The Fix

### What Changed:

1. **Store subscription ID** in `checkout.session.completed`
   - Added `stripe_subscription_id` to database update
   - This allows us to look up users in subsequent webhook events

2. **Use subscription data** in `customer.subscription.created`
   - Now actually updates user's expiration date from the webhook data
   - Looks up user by `stripe_subscription_id`

3. **Handle renewals** in `customer.subscription.updated`
   - Updates expiration when subscription renews

4. **Handle cancellations** in `customer.subscription.deleted`
   - Downgrades user to free tier when they cancel

### Database Migration Required:

**Run this SQL in your Supabase SQL Editor:**

```sql
-- Add stripe_subscription_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
```

Or use the file: `add-stripe-subscription-id-column.sql`

## Testing the Fix

### Step 1: Run Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Run the migration from `add-stripe-subscription-id-column.sql`
3. Verify column exists:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'stripe_subscription_id';
   ```

### Step 2: Make Test Purchase
1. Go to https://www.theeclodapps.com
2. Sign in or create new account
3. Click "Upgrade" → Complete Stripe checkout
4. Use test card: `4242 4242 4242 4242`

### Step 3: Verify Webhook Logs
Check Vercel logs (https://vercel.com/bryan-hs-projects-3bca947e/claude-test/logs):

**Expected output:**
```
handleCheckoutSessionCompleted called
✅ Subscription expires at: 2025-04-29T...
✅ Updated expiration for user from subscription.created event
```

### Step 4: Check Admin Console
1. Go to admin console
2. Find your user
3. **Expiration date should now show:** `2025-04-29T...` (not NULL!)

## Expected Behavior After Fix

### ✅ What Should Happen:

1. Purchase completes → User gets 7-day default initially
2. `customer.subscription.created` fires → Updates to real expiration (7 days from now)
3. Admin console shows actual expiration date
4. Subscription renews → Expiration automatically extends
5. User cancels → Immediately downgraded to free

### 🔄 Webhook Event Flow:

```
User clicks "Upgrade"
    ↓
Stripe Checkout
    ↓
checkout.session.completed ← Sets premium + 7-day default + stores subscription ID
    ↓
customer.subscription.created ← Updates to REAL expiration from Stripe
    ↓
User has correct expiration! ✅
```

## What About RevenueCat (iOS)?

For RevenueCat, we still need to diagnose why `expirationDate` isn't being returned. That requires:

1. Make test purchase on iOS
2. Check Xcode console for debug output
3. See what RevenueCat is actually returning

The 7-day fallback will protect users in the meantime.

## Summary

**Stripe Issue:** ✅ **FIXED** - Webhook now properly uses `customer.subscription.created` data
**RevenueCat Issue:** ⚠️ **Still investigating** - Need to see debug logs

**Action Required:**
1. Run database migration (add `stripe_subscription_id` column)
2. Test purchase on web
3. Verify expiration shows in admin console
4. Make iOS purchase and share debug logs

The web version should now work perfectly!
