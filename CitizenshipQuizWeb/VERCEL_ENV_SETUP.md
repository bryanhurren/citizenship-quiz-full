# Vercel Environment Variables Setup Guide

## How to Access Environment Variables in Vercel Dashboard

### Step 1: Go to Your Vercel Project

1. Visit: **https://vercel.com**
2. Click **Login** (top right)
3. You should see your project: **claude-test**
4. Click on the project name

### Step 2: Navigate to Environment Variables

Once inside your project:

1. Click **Settings** tab (top navigation bar)
2. In the left sidebar, click **Environment Variables**
3. This is where you add all your secrets!

**Direct link format:**
```
https://vercel.com/[your-username]/claude-test/settings/environment-variables
```

### Step 3: Add Environment Variables

For each variable below, click **Add New** (or **+** button):

#### Required Variables:

| Variable Name | Example Value | Environment | Description |
|--------------|---------------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://calexrqhodjgxlojokbb.supabase.co` | All (Production, Preview, Development) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | All | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Production only | Supabase service role key (keep secret!) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | All | Stripe publishable key |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Production only | Stripe secret key (keep secret!) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production only | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:8082` or `https://yourdomain.com` | Development = localhost, Production = your domain | Base URL for your app |
| `OPENAI_API_KEY` | `sk-proj-...` | All | OpenAI API key for AI evaluation |

#### Environment Selection:

When adding each variable, you'll see checkboxes for:
- ✅ **Production** - Your live site
- ✅ **Preview** - Preview deployments from branches
- ✅ **Development** - Local development (optional)

**For most variables:** Check ALL THREE boxes

**For secret keys (service role, stripe secret, webhook):** Check PRODUCTION only

### Step 4: Finding Your Values

#### Supabase Keys:
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click ⚙️ **Settings** → **API**
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

#### Stripe Keys:
1. Go to: https://dashboard.stripe.com
2. Click **Developers** → **API keys**
3. For testing:
   - Copy Publishable key (pk_test_...) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy Secret key (sk_test_...) → `STRIPE_SECRET_KEY`
4. For production (switch to "Live" mode in top right):
   - Copy Publishable key (pk_live_...) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy Secret key (sk_live_...) → `STRIPE_SECRET_KEY`

#### Stripe Webhook Secret:
**For Development (local testing):**
1. Run: `stripe listen --forward-to http://localhost:8082/api/stripe-webhook`
2. Copy the webhook signing secret (whsec_...)

**For Production:**
1. Go to: https://dashboard.stripe.com
2. Click **Developers** → **Webhooks**
3. Click **Add endpoint**
4. URL: `https://yourdomain.com/api/stripe-webhook`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click **Add endpoint**
7. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

#### OpenAI API Key:
1. Go to: https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key → `OPENAI_API_KEY`

### Step 5: Set NEXT_PUBLIC_APP_URL

This is the most important one to update when you add a custom domain!

**Current (temporary Vercel URL):**
```
NEXT_PUBLIC_APP_URL=https://claude-test-8p9oryaic-bryan-hs-projects-3bca947e.vercel.app
```

**After adding your custom domain:**
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Step 6: Redeploy After Adding Variables

After adding environment variables:

1. Go to **Deployments** tab
2. Click **...** (three dots) on the latest deployment
3. Click **Redeploy**
4. Check **Use existing Build Cache** (optional, makes it faster)
5. Click **Redeploy**

**Or via CLI:**
```bash
vercel --prod
```

### Step 7: Verify Variables Are Set

To check if variables are properly set:

1. Go to **Settings** → **Environment Variables**
2. You should see all variables listed (values are hidden for security)
3. Click **...** → **Edit** to update any value

## Quick Copy-Paste Template

Here's a template you can fill out and paste into a note while adding variables:

```bash
# Supabase (get from https://supabase.com/dashboard → your project → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (get from https://dashboard.stripe.com → Developers → API keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App URL (update when you add custom domain)
NEXT_PUBLIC_APP_URL=

# OpenAI (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=
```

## Environment-Specific Values

### Development Environment:
```
NEXT_PUBLIC_APP_URL=http://localhost:8082
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Production Environment:
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

## Common Issues

### "Environment variable not found" error:
- Make sure the variable name matches exactly (case-sensitive)
- Redeploy after adding variables
- Variables starting with `NEXT_PUBLIC_` are accessible in client-side code
- Variables without `NEXT_PUBLIC_` are server-side only

### Stripe webhook not working:
- Check `STRIPE_WEBHOOK_SECRET` is set in Production environment
- Verify webhook URL matches your domain
- Check webhook is active in Stripe Dashboard

### Changes not reflecting:
- Redeploy the project after changing environment variables
- Clear browser cache or use incognito mode
- Check you're updating the correct environment (Production vs Preview)

## Security Best Practices

✅ **DO:**
- Keep `STRIPE_SECRET_KEY` in Production environment only
- Keep `SUPABASE_SERVICE_ROLE_KEY` in Production only
- Use test keys in Preview/Development environments
- Rotate keys regularly

❌ **DON'T:**
- Share screenshots of your environment variables
- Commit `.env` files to Git
- Use production keys in development
- Share service role keys publicly

## Next Steps

After setting up environment variables:

1. ✅ Add all required environment variables
2. ✅ Redeploy your project
3. ✅ Test the deployed app
4. ✅ Add custom domain
5. ✅ Update `NEXT_PUBLIC_APP_URL` to your custom domain
6. ✅ Set up production Stripe webhook
7. ✅ Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
8. ✅ Final redeploy
9. ✅ Test complete purchase flow

## Visual Guide

```
Vercel Dashboard
  ↓
Your Project (claude-test)
  ↓
Settings Tab (top navigation)
  ↓
Environment Variables (left sidebar)
  ↓
Add New (+) button
  ↓
Enter:
  - Key: NEXT_PUBLIC_APP_URL
  - Value: https://yourdomain.com
  - Environment: ✅ Production ✅ Preview ✅ Development
  ↓
Save
  ↓
Repeat for all variables
  ↓
Redeploy
```

## Need Help?

If you can't find the Environment Variables section:
1. Make sure you're logged in to Vercel
2. Make sure you're viewing the correct project
3. Try this direct link format:
   ```
   https://vercel.com/[your-username]/claude-test/settings/environment-variables
   ```
4. Contact Vercel support via the dashboard chat (bottom right corner)
