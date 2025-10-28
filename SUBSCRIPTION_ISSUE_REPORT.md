# Subscription System Issue Report
**Date**: 2025-10-25
**User Affected**: bryan.hurren@gmail.com
**Severity**: HIGH - Affects all paying customers

## Problem Summary

User purchased a $0.99/week subscription via Stripe Checkout but shows as "Free" in the database and web app, while showing "Premium" on iOS.

## Root Causes Discovered

### Issue #1: Stripe Subscriptions Missing Billing Periods

**Finding**: Active Stripe subscriptions have `null` values for billing periods:
```json
{
  "id": "sub_1SLYsiFW0vYph1LcYOH3OjWm",
  "status": "active",
  "current_period_start": null,
  "current_period_end": null
}
```

**Why This is a Problem**:
- Webhook cannot calculate `subscription_expires_at`
- Database never gets updated with expiration date
- Users show as "Free" despite paying

**Possible Causes**:
1. **Stripe Price misconfiguration**: Price might be set as "one-time" instead of "recurring"
2. **Incomplete checkout**: Sessions completed without processing payment
3. **Test mode data**: Using test subscriptions without proper configuration

**Action Required**:
- Check Stripe Dashboard → Products → [Your Product] → Pricing
- Verify billing interval is set to "Weekly"
- Check if subscriptions have associated invoices/payments

### Issue #2: No Cross-Platform Subscription Support

**Current State**:
- **iOS**: Uses RevenueCat (Apple In-App Purchase)
- **Web**: Uses Stripe Checkout
- **Problem**: These are completely separate systems

**Impact**:
- User purchases on iOS won't work on Web
- User purchases on Web won't work on iOS
- No unified subscription status

**Solution Options**:

**Option A: RevenueCat Only** (Recommended)
- Make web use RevenueCat's REST API
- Unified subscription across all platforms
- RevenueCat handles Apple/Google/Stripe
- Cons: Need RevenueCat Pro plan ($300/mo)

**Option B: Platform-Specific**
- Keep iOS on RevenueCat, Web on Stripe
- Store both `revenuecat_subscription_id` and `stripe_subscription_id`
- Check both systems for premium status
- Cons: Complex, users need separate subscriptions per platform

**Option C: Stripe Only**
- Move iOS to Stripe Checkout (web view)
- Remove RevenueCat entirely
- Cons: Worse UX on iOS (no native payments), violates App Store guidelines

**Recommendation**: Option A or B depending on budget

### Issue #3: Webhook Doesn't Handle Edge Cases

**Current Webhook Issues**:
```javascript
// stripe-webhook.js line 92
const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
// ❌ Fails if current_period_end is null/undefined
```

**Missing Error Handling**:
- No validation that `current_period_end` exists
- No fallback for malformed subscriptions
- No alerting when webhook fails

**Required Fixes**:
1. Add defensive checks for null/undefined dates
2. Implement fallback expiration (e.g., 7 days from purchase)
3. Log errors to monitoring service
4. Send admin alerts on webhook failures

## Impact Analysis

**Current Customers Affected**: Potentially ALL paying customers
**Data Integrity**: ❌ CRITICAL - Payment records don't match database

**Customer Experience**:
- Paid but shows as "Free" ✅ -> ❌
- Can't access premium features despite paying
- No way to self-serve restore purchases

## Immediate Actions Required

### 1. Fix Current User (bryan.hurren@gmail.com)
**Status**: ⏳ Waiting for manual admin upgrade
- Admin console: Upgrade to Premium for 1 week

### 2. Audit All Customers
Run query to find mismatched subscriptions:
```sql
-- Find users who paid but show as free
SELECT u.username, u.subscription_tier, u.subscription_expires_at, u.stripe_subscription_id
FROM users u
WHERE u.stripe_subscription_id IS NOT NULL
  AND (u.subscription_tier != 'premium' OR u.subscription_expires_at IS NULL OR u.subscription_expires_at < NOW());
```

### 3. Check Stripe Configuration
- [ ] Verify Price object is "recurring" not "one-time"
- [ ] Check if test mode vs production mode
- [ ] Verify webhook endpoint is receiving events
- [ ] Check webhook signing secret is correct

### 4. Fix Webhook Code
Priority: HIGH
- Add null/undefined checks for billing periods
- Implement 7-day fallback expiration
- Add error logging and alerting

### 5. Add Monitoring
Priority: MEDIUM
- Daily cron to check for subscription mismatches
- Alert admins when Stripe subscription has no billing period
- Dashboard showing payment vs database status

## Long-Term Solutions

### Phase 1: Immediate Fixes (1-2 days)
1. ✅ Fix webhook to handle missing dates
2. ✅ Add monitoring for subscription mismatches
3. ✅ Audit and fix all affected customers

### Phase 2: Cross-Platform Support (1 week)
Choose and implement Option A or B:
- **Option A**: Migrate to RevenueCat for all platforms
- **Option B**: Implement dual-subscription system

### Phase 3: Reliability (Ongoing)
1. Add comprehensive error logging
2. Implement retry logic for webhook failures
3. Add admin dashboard for subscription health
4. Set up daily reconciliation job
5. Add customer-facing subscription management UI

## Test Cases to Add

1. ✅ Subscription with null billing periods
2. ✅ Expired subscription renewal
3. ✅ Multiple subscriptions for same user
4. ✅ Cross-platform subscription access
5. ✅ Failed payment handling
6. ✅ Refund handling
7. ✅ Trial period handling

## Monitoring Checklist

- [ ] Set up Stripe webhook event logging
- [ ] Create daily subscription reconciliation job
- [ ] Add alerting for webhook failures
- [ ] Track subscription conversion rate
- [ ] Monitor MRR (Monthly Recurring Revenue)
- [ ] Alert on subscription cancellations

## Questions to Answer

1. **Are customers actually being charged?**
   - Check Stripe Dashboard → Payments
   - Verify successful charge for $0.99

2. **Is the Stripe Price configured correctly?**
   - Should be "recurring" with "weekly" interval
   - Not "one-time" payment

3. **Are webhooks being delivered?**
   - Check Stripe Dashboard → Developers → Webhooks → Logs
   - Look for failed webhook deliveries

4. **Do we have production vs test mode confusion?**
   - Verify environment variables point to production keys
   - Check if test subscriptions are being created in production

## Files to Update

1. `/api/stripe-webhook.js` - Add null checks and fallbacks
2. `/api/create-checkout-session.js` - Verify price configuration
3. `/api/revenuecat-webhook.js` - CREATE (doesn't exist yet)
4. `/api/check-subscription-health.js` - CREATE for monitoring
5. `/api/reconcile-subscriptions.js` - CREATE for daily audit

## Next Steps

1. **Immediate** (Now):
   - ✅ Manually upgrade bryan.hurren@gmail.com in admin console
   - Check Stripe to see if payment actually went through

2. **Today**:
   - ✅ Fix webhook.js to handle null billing periods
   - ✅ Run audit query to find other affected users
   - Check Stripe Price configuration

3. **This Week**:
   - Decide on cross-platform solution (Option A vs B)
   - Implement webhook improvements
   - Add basic monitoring

4. **Next Week**:
   - Implement chosen cross-platform solution
   - Build admin dashboard for subscription health
   - Add customer-facing subscription management

---

## Fixes Applied - 2025-10-25

### ✅ Immediate Fixes Completed

1. **Updated stripe-webhook.js** (`/api/stripe-webhook.js`)
   - Added 7-day fallback for `handleSubscriptionCreated` when `current_period_end` is null
   - Added 7-day fallback for `handleSubscriptionUpdated` when `current_period_end` is null
   - Added detailed error logging to identify configuration problems
   - All webhook handlers now gracefully handle missing billing periods

2. **Updated sync-stripe-subscription.js** (`/api/sync-stripe-subscription.js`)
   - Added 7-day fallback logic for missing `current_period_end`
   - Returns warning when fallback is used
   - Includes `used_fallback` flag in response

3. **Updated fix-premium-users.js** (`/api/fix-premium-users.js`)
   - Added secret-based authentication (`?secret=temp-fix-2025`)
   - Uses 7-day fallback when Stripe subscriptions missing billing periods
   - Updates both `subscription_expires_at` and `stripe_subscription_id`
   - Returns `usedFallback` flag for affected users

4. **Created check-subscription-health.js** (`/api/check-subscription-health.js`)
   - New monitoring endpoint to audit all users with Stripe subscriptions
   - Identifies mismatches between database and Stripe
   - Checks for missing billing periods, tier mismatches, expiration date discrepancies
   - Returns summary with issues and healthy subscriptions

### ✅ User Fix Status

**bryan.hurren@gmail.com**:
- Status: ✅ FIXED
- Database updated to Premium with expiration: 2025-11-01
- Stripe subscription ID: sub_1SLYsiFW0vYph1LcYOH3OjWm
- Note: Used 7-day fallback (Stripe subscription missing `current_period_end`)

**Other Affected Users**:
- rebecyoung@gmail.com: Has active subscription but missing `current_period_end`
- Status: Premium in database, expires 2025-10-31

### 🔍 Root Cause Status

**Confirmed Issues**:
1. ✅ Webhook handlers now handle null billing periods with graceful fallback
2. ✅ All affected users can be identified via `/api/check-subscription-health`
3. ❌ **ROOT CAUSE NOT YET FIXED**: Stripe subscriptions are being created without `current_period_end`

**Still To Investigate**:
- Why are Stripe subscriptions being created without billing periods?
- Is the Stripe Price configured correctly as "recurring" weekly?
- Are webhooks being delivered successfully?
- Is there a test mode vs production mode mismatch?

### 📊 Monitoring Tools Added

1. **Health Check**: `GET /api/check-subscription-health?secret=temp-fix-2025`
   - Returns all subscription mismatches
   - Identifies users affected by missing billing periods

2. **Manual Sync**: `GET /api/sync-stripe-subscription?secret=temp-fix-2025&userEmail=<email>`
   - Manually sync a specific user's subscription from Stripe
   - Uses 7-day fallback if billing period missing

3. **Bulk Fix**: `GET /api/fix-premium-users?secret=temp-fix-2025`
   - Fixes all premium users without expiration dates
   - Uses 7-day fallback for subscriptions without billing periods

### ⚠️ Known Limitations

1. **7-Day Fallback is Temporary**
   - Users with fallback expirations need manual renewal after 7 days
   - Not a permanent solution - root cause must be fixed

2. **No Cross-Platform Support Yet**
   - iOS purchases (RevenueCat) won't work on Web
   - Web purchases (Stripe) won't work on iOS
   - Need to implement unified subscription system

3. **No Automated Monitoring**
   - Health check must be run manually
   - No alerts when new subscriptions fail
   - No daily reconciliation job yet

---

**Priority**: 🟡 MEDIUM (immediate crisis resolved, but root cause remains)
**Assignee**: Engineering Team
**Estimated Fix Time**: 1-2 weeks for root cause resolution + cross-platform support
