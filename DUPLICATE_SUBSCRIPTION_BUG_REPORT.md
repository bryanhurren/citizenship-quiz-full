# Duplicate Subscription Bug Report

**Date Discovered**: 2025-10-25
**Severity**: 🔴 CRITICAL - Financial Impact
**Status**: ✅ FIXED (as of 2025-10-25 16:56 UTC)

---

## Executive Summary

A critical bug was discovered where the system created **multiple Stripe subscriptions** for the same user, resulting in duplicate charges. The system did not check for existing active subscriptions before creating new checkout sessions.

### Impact
- **Users Affected**: Potentially all web users who attempted to re-subscribe
- **Financial Impact**: Multiple $0.99/week charges per affected user
- **Database Integrity**: Multiple Stripe customer records and subscriptions per user

---

## Root Cause

The `create-checkout-session.js` endpoint did **not check** if a user already had an active Stripe subscription before creating a new checkout session. This meant:

1. User purchases subscription → Gets charged $0.99
2. Subscription fails to sync to database (due to missing billing periods bug)
3. User sees "Free" tier, tries to subscribe again
4. System creates NEW subscription instead of recognizing existing one
5. User gets charged AGAIN ($0.99 #2)
6. Repeat for each attempted "fix"

---

## Evidence - bryan.hurren@gmail.com Case Study

### Stripe Customer Records (4 duplicates)
```
1. cus_TI3qSK6uaLiVxh - Created: 2025-10-23 18:09:39
2. cus_TI33kkQxMJMTi3 - Created: 2025-10-23 18:58:32
3. cus_TI7lley0hPOViw - Created: 2025-10-23 23:02:07
4. cus_TI9Bp0Oz0J8YAj - Created: 2025-10-24 00:29:21
```

### Active Subscriptions (2 duplicates)
```
1. sub_1SLXWIFW0vYph1Lc2OiTT79p - Customer: cus_TI7lley0hPOViw
   Status: active
   Created: 2025-10-23 23:02:07
   Billing Periods: NULL (missing current_period_start/end)

2. sub_1SLYsiFW0vYph1LcYOH3OjWm - Customer: cus_TI9Bp0Oz0J8YAj
   Status: active
   Created: 2025-10-24 00:29:21
   Billing Periods: NULL (missing current_period_start/end)
   ✅ CANCELED: 2025-10-25 16:56:35
```

### Credit Card Charges
Multiple $0.99 charges visible on user's credit card statement.

---

## Fix Applied

### 1. Prevention - Updated `create-checkout-session.js`

**File**: `CitizenshipQuizWeb/api/create-checkout-session.js`

**Change**: Added pre-checkout validation
```javascript
// Check if user already has an active subscription
const existingCustomers = await stripe.customers.list({
  email: userEmail,
  limit: 10,
});

// Check if any customer has an active subscription
for (const customer of existingCustomers.data) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: 'active',
    limit: 10,
  });

  if (subscriptions.data.length > 0) {
    return res.status(400).json({
      error: 'You already have an active subscription',
      existingSubscriptionId: subscriptions.data[0].id,
      customerId: customer.id,
      message: 'Please contact support if you believe this is an error.',
    });
  }
}
```

**Result**: New checkout sessions are now blocked if user has active subscription.

---

### 2. Cleanup - Created `cancel-duplicate-subscriptions.js`

**File**: `CitizenshipQuizWeb/api/cancel-duplicate-subscriptions.js`

**Features**:
- Finds all subscriptions for a user email
- Keeps the oldest subscription (first created)
- Cancels newer duplicate subscriptions
- Supports `dryRun=true` for safe preview
- Updates database with correct subscription ID

**Usage**:
```bash
# Dry run (preview only)
curl "https://www.theeclodapps.com/api/cancel-duplicate-subscriptions?secret=temp-fix-2025&userEmail=user@example.com&dryRun=true"

# Live execution (cancels duplicates)
curl "https://www.theeclodapps.com/api/cancel-duplicate-subscriptions?secret=temp-fix-2025&userEmail=user@example.com&dryRun=false"
```

---

## Remediation Actions

### ✅ Completed

1. **Fixed Prevention Logic** - Deployed to production 2025-10-25
2. **Canceled Duplicate Subscription** - bryan.hurren@gmail.com cleaned up
3. **Updated Database** - Points to correct subscription ID

### 🔄 In Progress

4. **Issue Refunds** - Need to process via Stripe Dashboard
   - Identify all duplicate charges
   - Issue refunds for extra $0.99 charges
   - Document refund amounts and dates

### 📋 Recommended Next Steps

5. **Audit All Customers** - Run health check to find other affected users
   ```bash
   curl "https://www.theeclodapps.com/api/check-subscription-health?secret=temp-fix-2025"
   ```

6. **Check for Other Affected Users** - Look for users with multiple active subscriptions

7. **Implement Monitoring** - Add alerts when duplicate subscriptions are detected

8. **Customer Communication** - If other users affected, notify them of refunds

---

## Refund Process for bryan.hurren@gmail.com

### Subscriptions to Refund

You likely have multiple $0.99 charges. Based on the Stripe data:

1. **Subscription #1** (sub_1SLXWIFW0vYph1Lc2OiTT79p)
   - Created: 2025-10-23 23:02:07
   - Status: ✅ KEPT (still active)
   - Action: **NO REFUND** (this is your legitimate subscription)

2. **Subscription #2** (sub_1SLYsiFW0vYph1LcYOH3OjWm)
   - Created: 2025-10-24 00:29:21
   - Status: ❌ CANCELED
   - Charge: $0.99 (duplicate)
   - Action: **REFUND THIS CHARGE**

3. **Additional Charges** (if any)
   - Check your credit card statement for other $0.99 charges
   - Each represents a failed subscription attempt
   - Action: **REFUND ALL DUPLICATES**

### How to Issue Refunds

**Via Stripe Dashboard**:
1. Go to https://dashboard.stripe.com/payments
2. Filter by customer email: bryan.hurren@gmail.com
3. Find charges associated with subscription: sub_1SLYsiFW0vYph1LcYOH3OjWm
4. Click "Refund" for each duplicate charge
5. Select "Full refund" ($0.99)
6. Add reason: "Duplicate subscription - system error"

**Expected Total Refund**: $0.99 × (number of duplicate subscriptions)

---

## Prevention Going Forward

### Deployed Fixes
✅ Pre-checkout validation prevents new duplicates
✅ Cleanup endpoint available for future issues
✅ Database updates ensure consistency

### Still Needed
- [ ] Automated monitoring for duplicate subscriptions
- [ ] Daily reconciliation job
- [ ] Customer-facing subscription management UI
- [ ] Alert system for subscription anomalies

---

## Technical Details

### Why Multiple Subscriptions Were Created

The duplicate subscription bug occurred due to **two separate bugs working together**:

**Bug #1: Missing Billing Periods**
- Stripe subscriptions created without `current_period_start/end`
- Webhook couldn't set `subscription_expires_at` in database
- Users showed as "Free" despite paying

**Bug #2: No Duplicate Check** (THIS BUG)
- Checkout endpoint didn't verify existing subscriptions
- Users seeing "Free" would try to subscribe again
- System created new subscription instead of recognizing existing one

### Fix Interaction

Both bugs needed to be fixed:
1. ✅ **Bug #1 Fix**: Added 7-day fallback for missing billing periods
2. ✅ **Bug #2 Fix**: Added duplicate subscription prevention

---

## Lessons Learned

1. **Always check for existing resources** before creating paid resources
2. **Implement comprehensive error handling** for payment flows
3. **Add monitoring early** - detect anomalies before they become expensive
4. **Test subscription edge cases** - expired, duplicate, failed payment, etc.
5. **Rate limiting is not enough** - need business logic validation too

---

## Files Modified

1. `CitizenshipQuizWeb/api/create-checkout-session.js` - Added duplicate prevention
2. `CitizenshipQuizWeb/api/cancel-duplicate-subscriptions.js` - NEW cleanup endpoint
3. `CitizenshipQuizWeb/api/stripe-webhook.js` - Added 7-day fallback (related fix)
4. `CitizenshipQuizWeb/api/sync-stripe-subscription.js` - Added 7-day fallback (related fix)
5. `CitizenshipQuizWeb/api/fix-premium-users.js` - Added 7-day fallback (related fix)

---

**Report Generated**: 2025-10-25
**Next Review**: After refund processing and customer audit
