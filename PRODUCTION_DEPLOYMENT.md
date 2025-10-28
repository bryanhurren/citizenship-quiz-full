# Production Deployment Guide - Stripe Integration

## Current Status

**You are currently running with TEST MODE keys in production**, even though you have live keys stored in `.env.vercel`. We updated the production environment to use test keys during troubleshooting.

### Current Production Environment Variables:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_test_...` (TEST MODE ❌)
- `STRIPE_SECRET_KEY`: `sk_test_...` (TEST MODE ❌)
- `STRIPE_WEBHOOK_SECRET`: `whsec_Ja55...` (TEST MODE ❌)
- `STRIPE_PRICE_ID`: `price_1SLGuw...` (TEST MODE ❌)

### Available Live Mode Keys (from .env.vercel):
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_live_51SLEgs...`
- `STRIPE_SECRET_KEY`: `sk_live_51SLEgs...`
- `STRIPE_WEBHOOK_SECRET`: `whsec_GkOST...`
- `STRIPE_PRICE_ID`: `price_1SLEmk...`

---

## Production Deployment Checklist

### Phase 1: Stripe Dashboard Setup (Live Mode)

1. **Switch to Live Mode in Stripe Dashboard**
   - Toggle to "Live mode" in top-right of dashboard
   - Ensure your account is fully activated

2. **Create/Verify Live Mode Product & Pricing**
   ```
   Current test product: Weekly subscription at $0.99
   ```
   - Go to Products → Create product (or verify existing)
   - Set pricing: Weekly at $0.99 (or your desired production price)
   - Copy the **Live Mode Price ID** (starts with `price_...`)

3. **Configure Live Mode Webhook**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://www.theeclodapps.com/api/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Click "Add endpoint"
   - **Copy the webhook signing secret** (starts with `whsec_...`)

4. **Get Live Mode API Keys**
   - Go to Developers → API keys
   - View Live mode keys:
     - **Publishable key** (starts with `pk_live_...`)
     - **Secret key** (starts with `sk_live_...`)

---

### Phase 2: Update Vercel Environment Variables

Run these commands to update production environment:

```bash
# 1. Update Publishable Key
npx vercel env rm NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
echo "[paste your pk_live_... key]" | npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# 2. Update Secret Key
npx vercel env rm STRIPE_SECRET_KEY production
echo "[paste your sk_live_... key]" | npx vercel env add STRIPE_SECRET_KEY production

# 3. Update Webhook Secret
npx vercel env rm STRIPE_WEBHOOK_SECRET production
echo "[paste your live whsec_... key]" | npx vercel env add STRIPE_WEBHOOK_SECRET production

# 4. Update Price ID
npx vercel env rm STRIPE_PRICE_ID production
echo "[paste your live price_... ID]" | npx vercel env add STRIPE_PRICE_ID production
```

**OR use the values from your .env.vercel file:**

```bash
# Update to live keys from .env.vercel
npx vercel env rm NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
printf "pk_live_51SLEgsFW0vYph1Lc4lhyFDOwtRlAgY6aRQkMLdRpVRszoDBizMpdFEfuhgKFKbPXgnvj6s2E11YfaG5kSJhHOIFf007rh3a6fU" | npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

npx vercel env rm STRIPE_SECRET_KEY production
printf "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" | npx vercel env add STRIPE_SECRET_KEY production

npx vercel env rm STRIPE_PRICE_ID production
printf "price_1SLEmkF5oa6s4zGiMnJAcQdt" | npx vercel env add STRIPE_PRICE_ID production

# Use NEW live webhook secret from Step 3 above
npx vercel env rm STRIPE_WEBHOOK_SECRET production
printf "[your NEW live webhook secret]" | npx vercel env add STRIPE_WEBHOOK_SECRET production
```

---

### Phase 3: Deploy to Production

```bash
# Deploy with new live mode environment variables
npx vercel --prod
```

---

### Phase 4: Testing in Production

**IMPORTANT:** You cannot use test card numbers in live mode!

1. **Test with a Real Card (Small Amount)**
   - Use a company credit card
   - Complete a real subscription purchase ($0.99)
   - Verify the webhook succeeds in Stripe Dashboard
   - Verify user is upgraded to premium in Supabase
   - **Immediately cancel/refund the subscription**

2. **Check Webhook Events**
   ```bash
   # Check recent live mode events
   curl "https://api.stripe.com/v1/events?limit=5" \
     -u "sk_live_[your_key]:" \
     -H "Stripe-Version: 2025-09-30.clover"
   ```

3. **Verify Database Update**
   ```bash
   curl 'https://calexrqhodjgxlojokbb.supabase.co/rest/v1/users?select=subscription_tier&username=eq.[test_email]' \
     -H "apikey: [your_anon_key]" \
     -H "Authorization: Bearer [your_service_role_key]"
   ```

4. **Monitor Vercel Logs**
   ```bash
   npx vercel logs https://www.theeclodapps.com
   ```

---

### Phase 5: Post-Deployment Verification

- [ ] Live webhook endpoint is receiving events (check Stripe Dashboard)
- [ ] Webhook events are succeeding (no 400/500 errors)
- [ ] Database updates correctly on purchase
- [ ] UI shows premium status after purchase
- [ ] Subscription renewals work (check after 1 week for weekly subscription)
- [ ] Cancellation flow works (downgrade to free)

---

## Key Differences: Test vs Live Mode

| Aspect | Test Mode | Live Mode |
|--------|-----------|-----------|
| API Keys | `sk_test_...`, `pk_test_...` | `sk_live_...`, `pk_live_...` |
| Webhook Secret | `whsec_test_...` or `whsec_...` | `whsec_...` (different value) |
| Products/Prices | Separate test products | Separate live products |
| Payments | Test cards (4242 4242...) | Real credit cards only |
| Data | Test data (not real customers) | Real customer data |
| Dashboard | Toggle to "Test" | Toggle to "Live" |

---

## Rollback Plan

If you need to rollback to test mode:

```bash
# Revert to test keys
npx vercel env rm NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
printf "pk_test_51SLEgsFW0vYph1LcmQ4i8qZoZQ7cBGUKsbCCCWt9JA9hj4F1q2WlH1o33G7IvbXayqIzBB1fg7NjmjajDOJm3hdd00cXyPt02X" | npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

npx vercel env rm STRIPE_SECRET_KEY production
printf "sk_test_51SLEgsFW0vYph1LcJG9q4dH2f9wTnd4bMUpiNSIagEIqmDkjC3nkvBMJAaCMUVCJlc5AZ3KkUhqyZ4pDSnk07IVm00DX5P8GtE" | npx vercel env add STRIPE_SECRET_KEY production

npx vercel env rm STRIPE_WEBHOOK_SECRET production
printf "whsec_Ja55vvOPiSW8ZBZuTircQY8LI5Npr4KR" | npx vercel env add STRIPE_WEBHOOK_SECRET production

npx vercel env rm STRIPE_PRICE_ID production
printf "price_1SLGuwFW0vYph1LchG2XURQ6" | npx vercel env add STRIPE_PRICE_ID production

# Redeploy
npx vercel --prod
```

---

## Security Reminders

- ✅ Never commit API keys to git
- ✅ Keep webhook secrets secure
- ✅ Use environment variables for all sensitive data
- ✅ Rotate keys if compromised
- ✅ Monitor Stripe logs for suspicious activity
- ✅ Set up Stripe Radar for fraud detection

---

## Support Resources

- [Stripe Go-Live Checklist](https://docs.stripe.com/get-started/checklist/go-live)
- [Stripe API Keys Documentation](https://docs.stripe.com/keys)
- [Webhook Best Practices](https://docs.stripe.com/webhooks/best-practices)
