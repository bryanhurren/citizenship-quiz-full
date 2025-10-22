# Vercel Deployment Guide

This guide explains how to deploy the AI Citizenship Quiz web app to Vercel with your custom domain.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your custom domain name
- GitHub/GitLab/Bitbucket account (for connecting your repository)

## Step 1: Prepare Your Project

1. **Ensure your project is in a Git repository:**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Make sure all environment variables are documented** in `.env.example`

## Step 2: Connect to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Project"
3. Connect your Git provider (GitHub, GitLab, or Bitbucket)
4. Select your repository (`CitizenshipQuizWeb`)
5. Vercel will auto-detect it as an Expo project

### Option B: Deploy via CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel
```

## Step 3: Configure Build Settings

Vercel should auto-detect your Expo/React Native Web project. Verify these settings:

- **Framework Preset:** Other (Expo handles the build)
- **Build Command:** `npx expo export:web`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

If not auto-detected, you can set these manually in the Vercel dashboard under:
Project Settings > Build & Development Settings

## Step 4: Add Environment Variables

In the Vercel dashboard, go to:
**Project Settings > Environment Variables**

Add these variables for **Production**, **Preview**, and **Development**:

### Required Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://calexrqhodjgxlojokbb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# OpenAI (for AI evaluation)
OPENAI_API_KEY=your_openai_api_key
```

**Important:**
- Use **production Stripe keys** for production environment
- Use **test Stripe keys** for preview/development environments
- Update `NEXT_PUBLIC_APP_URL` to match your domain

## Step 5: Deploy

Click **Deploy** in the Vercel dashboard or run:
```bash
vercel --prod
```

Vercel will:
1. Install dependencies
2. Build your project with `npx expo export:web`
3. Deploy to a temporary `.vercel.app` URL

## Step 6: Connect Your Custom Domain

1. In Vercel dashboard, go to: **Project Settings > Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `citizenquiz.com` or `quiz.yourdomain.com`)
4. Click **Add**

### Configure DNS

Vercel will show you the DNS records to add. You have two options:

#### Option A: Using Nameservers (Recommended - Easiest)

If you bought your domain from a registrar like GoDaddy, Namecheap, etc.:

1. In your domain registrar, find "Nameservers" or "DNS Settings"
2. Change nameservers to Vercel's:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
3. Wait for propagation (can take up to 48 hours, usually much faster)

#### Option B: Using CNAME Record

If you want to keep your current nameservers:

1. In your DNS provider, add a CNAME record:
   - **Type:** CNAME
   - **Name:** `@` (for root domain) or `quiz` (for subdomain)
   - **Value:** `cname.vercel-dns.com`
2. If using root domain, you may also need an A record:
   - **Type:** A
   - **Name:** `@`
   - **Value:** `76.76.21.21`

### Common Domain Registrars:

**GoDaddy:**
1. Log into GoDaddy
2. Go to "My Products" > Domain > DNS
3. Change nameservers or add CNAME record

**Namecheap:**
1. Domain List > Manage > Advanced DNS
2. Change nameservers or add CNAME record

**Google Domains:**
1. My Domains > DNS
2. Change nameservers or add custom resource record

**Cloudflare:**
1. Add site to Cloudflare
2. Update nameservers at your registrar to Cloudflare's
3. Add DNS record pointing to Vercel

## Step 7: Configure Stripe Webhook for Production

Once your domain is live:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Live mode** (toggle in top right)
3. Go to **Developers > Webhooks**
4. Click **Add endpoint**
5. Enter your webhook URL:
   ```
   https://yourdomain.com/api/stripe-webhook
   ```
6. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. Copy the **Signing secret** (starts with `whsec_`)
8. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables
9. Redeploy your app (or wait for auto-deploy)

## Step 8: Test Production Deployment

1. Visit your domain
2. Test login flow
3. Test quiz functionality
4. Test upgrade flow with a real Stripe payment (or test mode)
5. Verify webhook is receiving events in Stripe Dashboard

## Continuous Deployment

Vercel automatically deploys when you push to your Git repository:

- **Push to `main` branch** → Deploys to production (your custom domain)
- **Push to other branches** → Creates preview deployments

To disable auto-deploy:
Project Settings > Git > Configure

## Monitoring & Logs

View logs and analytics:
1. Go to your project in Vercel dashboard
2. Click **Deployments** to see build logs
3. Click **Analytics** to see traffic
4. Click **Functions** to see API endpoint logs

## Troubleshooting

### Build Fails

**Check Vercel build logs:**
- Ensure all dependencies are in `package.json`
- Verify build command is correct
- Check for TypeScript errors

**Common fixes:**
```bash
# Clear cache and rebuild locally first
npm run clean
npx expo export:web

# If successful, commit and push
git add .
git commit -m "Fix build"
git push
```

### Environment Variables Not Working

- Ensure variable names start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding/changing environment variables
- Check you added variables to correct environment (Production/Preview/Development)

### Domain Not Working

- Wait 24-48 hours for DNS propagation
- Use [DNS Checker](https://dnschecker.org) to verify propagation
- Clear browser cache or try incognito mode
- Verify DNS records in your domain registrar

### Stripe Webhook Failing

- Verify webhook URL is correct (https://yourdomain.com/api/stripe-webhook)
- Check webhook signing secret matches Vercel environment variable
- View webhook delivery attempts in Stripe Dashboard
- Check Vercel function logs for errors

## Performance Optimization

### Enable Vercel Speed Insights

1. Install the package:
   ```bash
   npm install @vercel/speed-insights
   ```

2. Add to your `App.tsx`:
   ```tsx
   import { SpeedInsights } from '@vercel/speed-insights/react';

   export default function App() {
     return (
       <>
         <YourApp />
         <SpeedInsights />
       </>
     );
   }
   ```

### Enable Vercel Analytics

1. Install the package:
   ```bash
   npm install @vercel/analytics
   ```

2. Add to your `App.tsx`:
   ```tsx
   import { Analytics } from '@vercel/analytics/react';

   export default function App() {
     return (
       <>
         <YourApp />
         <Analytics />
       </>
     );
   }
   ```

## Cost

Vercel Pricing:
- **Hobby Plan:** FREE
  - Unlimited deployments
  - Custom domain
  - 100GB bandwidth/month
  - Perfect for this project

- **Pro Plan:** $20/month
  - 1TB bandwidth
  - Password protection
  - Advanced analytics

For this app, the **free Hobby plan** is sufficient unless you have high traffic.

## Security Checklist

- [ ] All API keys in environment variables (not hardcoded)
- [ ] Stripe webhook secret configured
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Supabase Row Level Security (RLS) enabled
- [ ] CORS configured properly
- [ ] Rate limiting on API endpoints (consider adding)

## Next Steps

After deployment:
1. Monitor error logs in Vercel dashboard
2. Set up Vercel notifications for failed deployments
3. Configure custom error pages if needed
4. Add custom domain email forwarding (if supported by registrar)
5. Set up uptime monitoring (e.g., UptimeRobot)

## Support

- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support:** Available in dashboard
- **Community:** [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
