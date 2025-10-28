# Payment Processor Diagnostic Guide

## Summary of Changes

✅ **Implemented 7-day default expiration workaround**
- If payment processor doesn't return expiration date, we now set it to 7 days from purchase
- If processor provides actual expiration, we use that instead
- This ensures premium users always have a valid expiration date

✅ **Added comprehensive logging**
- Both iOS and Web now log full payment processor responses
- Check console output to see what data is being returned

✅ **Removed unsafe fallback**
- Old logic: `if no expiration date → allow unlimited access forever` ❌
- New logic: `if no expiration date → use 7-day default` ✅

---

## Issue Analysis

You're seeing **no expiration date** in your admin console for premium subscriptions. This indicates that **both** payment processors (RevenueCat and Stripe) are failing to provide expiration dates.

### Why This Happens

**RevenueCat (iOS):**
- Requires proper product configuration in RevenueCat dashboard
- Product must be set as **auto-renewable subscription** (not consumable/non-renewing)
- Entitlement must be correctly mapped to the product

**Stripe (Web):**
- Requires subscription product (not one-time payment)
- Webhook must successfully retrieve subscription details
- `subscription.current_period_end` must be present

---

## Diagnostic Steps

### 1. Check RevenueCat Configuration (iOS)

#### Step 1.1: Verify Product Type
1. Go to https://app.revenuecat.com
2. Navigate to your project → **Products**
3. Find product: `weekly_premium_subscription`
4. Verify:
   - ✅ **Type**: Auto-renewable subscription
   - ✅ **Duration**: 1 week
   - ✅ **Store**: Apple App Store

#### Step 1.2: Verify Entitlement Mapping
1. In RevenueCat dashboard → **Entitlements**
2. Click on `premium` entitlement
3. Verify:
   - ✅ Product `weekly_premium_subscription` is attached
   - ✅ Store is set to "Apple App Store"

#### Step 1.3: Check App Store Connect Product
1. Go to https://appstoreconnect.apple.com
2. Navigate to your app → **In-App Purchases**
3. Find subscription: `weekly_premium_subscription`
4. Verify:
   - ✅ **Type**: Auto-Renewable Subscription
   - ✅ **Duration**: 1 week
   - ✅ **Status**: Ready to Submit (or Approved)
   - ✅ **Subscription Group**: Created and active

⚠️ **Common Issue**: If product type is "Non-Consumable" or "Non-Renewing Subscription", RevenueCat won't provide an expiration date!

#### Step 1.4: Test Purchase Flow
1. Make a test purchase in your iOS app
2. Check Xcode console output for:
   ```
   === PURCHASE DEBUG ===
   Full customerInfo: {...}
   Premium entitlement: {...}
   Expiration date raw: [should see a date here]
   Expiration date type: [should be 'string']
   ```
3. If you see:
   - `Expiration date raw: null` → Product is misconfigured
   - `Expiration date raw: 2025-02-01T00:00:00Z` → Working correctly!

---

### 2. Check Stripe Configuration (Web)

#### Step 2.1: Verify Product Type in Stripe Dashboard
1. Go to https://dashboard.stripe.com (or test mode)
2. Navigate to **Products**
3. Find your premium subscription product
4. Verify:
   - ✅ **Type**: Recurring
   - ✅ **Billing period**: Weekly
   - ✅ **Price**: $0.99/week

⚠️ **Common Issue**: If product is "One-time" instead of "Recurring", there's no expiration date!

#### Step 2.2: Get Stripe Price ID
1. In Stripe Dashboard → **Products** → Click your product
2. Copy the **Price ID** (starts with `price_`)
3. Verify it matches your environment variable:
   ```bash
   # Check Vercel environment variable
   STRIPE_PRICE_ID=price_XXXXXXXXXXXX
   ```

#### Step 2.3: Check Webhook Configuration
1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click your production webhook endpoint
3. Verify:
   - ✅ URL: `https://www.theeclodapps.com/api/stripe-webhook`
   - ✅ Status: Enabled
   - ✅ Events: `checkout.session.completed`, `customer.subscription.created`

#### Step 2.4: Test Purchase and Check Logs
1. Make a test purchase on web
2. In Vercel dashboard → Your project → **Logs**
3. Search for webhook logs, should see:
   ```
   ✅ Subscription expires at: 2025-02-01T00:00:00.000Z
   ```
4. If you see:
   ```
   ⚠️ No expiration date from Stripe - using 7-day default
   ```
   → Product is misconfigured or webhook failed

---

## Quick Fixes

### Fix 1: RevenueCat Product Configuration

If product is wrong type in App Store Connect, you need to:
1. Delete the old product
2. Create a **new** Auto-Renewable Subscription
3. Create a Subscription Group first
4. Add the subscription to the group
5. Wait for Apple approval (24-48 hours)
6. Update RevenueCat to use the new product ID

### Fix 2: Stripe Product Configuration

If product is one-time instead of recurring:
1. Create a **new** recurring product in Stripe
2. Set billing period to "Weekly"
3. Set price to $0.99
4. Copy the new Price ID
5. Update Vercel environment variable:
   ```bash
   vercel env add STRIPE_PRICE_ID
   # Paste the new price_XXXXXXXXXXXX
   ```
6. Redeploy: `vercel --prod`

### Fix 3: Fix Existing Premium Users

If you have users with NULL expiration dates in database:

```sql
-- Check how many users are affected
SELECT COUNT(*) FROM users
WHERE subscription_tier = 'premium'
AND subscription_expires_at IS NULL;

-- Set default 7-day expiration for all affected users
UPDATE users
SET subscription_expires_at = NOW() + INTERVAL '7 days'
WHERE subscription_tier = 'premium'
AND subscription_expires_at IS NULL;
```

---

## Testing the Fix

After configuring products correctly:

### iOS Test:
1. Delete app from simulator
2. Reinstall and make fresh purchase
3. Check console for: `📅 Using expiration date from RevenueCat: ...`
4. Check admin console → should show expiration date
5. Verify premium access works

### Web Test:
1. Clear browser cookies/local storage
2. Create new account
3. Purchase premium
4. Check Vercel logs for: `✅ Subscription expires at: ...`
5. Check admin console → should show expiration date
6. Verify premium access works

---

## What to Look For

### ✅ Success Indicators
- RevenueCat returns `expirationDate` (not null)
- Stripe returns `subscription.current_period_end` (not null)
- Admin console shows expiration date in format: `2025-02-01T00:00:00.000Z`
- Premium users can answer unlimited questions
- Daily limit dialog never appears for premium users

### ❌ Failure Indicators
- Console shows: `⚠️ No expiration date from RevenueCat - using 7-day default`
- Console shows: `⚠️ No expiration date from Stripe - using 7-day default`
- Admin console shows: NULL or empty for `subscription_expires_at`
- Premium users see daily limit dialog after 7 days

---

## Current Workaround Status

With the 7-day default workaround now in place:
- ✅ Premium users will have access for at least 7 days
- ✅ No more infinite premium access without expiration
- ⚠️ Subscriptions won't auto-renew correctly (users will lose access after 7 days)
- ⚠️ You'll need to manually extend premium or fix the product configuration

**This is a temporary fix** - you should configure the products correctly to get real expiration dates from the payment processors.

---

## Next Steps

1. **Check product configurations** in both RevenueCat and Stripe dashboards
2. **Make a test purchase** and watch the console logs
3. **Run the SQL query** to check existing premium users
4. **Report back** with console output so we can diagnose the issue further

## Questions to Answer

1. What product type is configured in App Store Connect? (Auto-renewable subscription vs Non-renewing vs Consumable)
2. What product type is configured in Stripe? (Recurring vs One-time)
3. What does the console show when making a purchase?
4. How many existing premium users have NULL expiration dates?
