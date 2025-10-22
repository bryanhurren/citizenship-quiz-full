# Stripe Integration Setup Guide

This guide explains how to set up Stripe payments for the web version of the AI Citizenship Quiz app.

## Overview

The web app uses Stripe Checkout for weekly recurring subscriptions at $0.99/week, mirroring the iOS in-app purchase functionality.

## Features

- **Free Tier**: 5 questions per day
- **Premium Tier**: Unlimited questions, $0.99/week subscription
- Automatic subscription management via Stripe webhooks
- Seamless upgrade flow from ProfileScreen or when hitting daily limit

## Setup Steps

### 1. Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and sign up
2. Complete account verification
3. Switch to Test mode for development

### 2. Get API Keys

1. Go to Developers > API keys in the Stripe Dashboard
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# App URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:8082
```

### 4. Set Up Stripe Webhook

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhook events to local development:
   ```bash
   stripe listen --forward-to http://localhost:8082/api/stripe-webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### 5. Configure Vercel Environment Variables

For production deployment, add these environment variables in the Vercel dashboard:

1. Go to your project settings
2. Navigate to Environment Variables
3. Add:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Production publishable key)
   - `STRIPE_SECRET_KEY` (Production secret key)
   - `STRIPE_WEBHOOK_SECRET` (Production webhook secret)
   - `NEXT_PUBLIC_APP_URL` (Your production URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (For webhook database updates)

### 6. Set Up Production Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.vercel.app/api/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel

### 7. Update Database Schema

Ensure your Supabase `users` table has these columns:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

## Testing

### Test the Upgrade Flow

1. Start the development server: `npm run web`
2. Log in to the app
3. Click "upgrade" in the ProfileScreen
4. In the UpgradeModal, click "Upgrade Now"
5. You'll be redirected to Stripe Checkout
6. Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

### Verify Webhook

1. Complete a test purchase
2. Check the Stripe CLI output for webhook events
3. Verify the user's subscription status updated in Supabase

## API Endpoints

### `/api/create-checkout-session`

Creates a Stripe Checkout session for subscription purchase.

**Request:**
```json
{
  "userId": 123,
  "userEmail": "user@example.com"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### `/api/stripe-webhook`

Handles Stripe webhook events to update user subscriptions.

**Events Handled:**
- `checkout.session.completed`: Activates premium subscription
- `customer.subscription.updated`: Updates subscription status
- `customer.subscription.deleted`: Downgrades to free tier

## Troubleshooting

### Webhook not receiving events

- Ensure Stripe CLI is running (`stripe listen`)
- Check that the webhook URL is correct
- Verify the webhook secret matches

### Checkout redirect not working

- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- Ensure the success/cancel URLs are whitelisted in Stripe

### Subscription not activating

- Check Vercel function logs for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` has permission to update users table
- Check that user ID is being passed correctly

## Production Checklist

- [ ] Switch from test keys to live keys
- [ ] Update webhook endpoint to production URL
- [ ] Configure production webhook secret
- [ ] Test complete purchase flow in production
- [ ] Monitor Stripe Dashboard for successful payments
- [ ] Set up email notifications for failed payments

## Support

For Stripe-specific questions, see:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
