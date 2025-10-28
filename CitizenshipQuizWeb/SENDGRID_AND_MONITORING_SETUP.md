# SendGrid & Monitoring Setup Guide

**Date**: 2025-10-26
**Status**: Monitoring deployed, SendGrid configuration pending

---

## ✅ What's Already Deployed

The monitoring system is now live in production:

1. ✅ **Health Endpoint**: `/api/health`
2. ✅ **Daily Report Generator**: `/api/generate-daily-report`
3. ✅ **Subscription Health Monitor**: `/api/check-subscription-health`
4. ✅ **Cron Job Configured**: Daily reports at 8:00 AM UTC

---

## 📋 Remaining Setup Tasks

### Task 1: Run Database Migrations in Supabase

#### Step 1.1: Add Email Columns to admin_users

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `admin_email_migration.sql`:

```sql
-- From: CitizenshipQuizWeb/admin_email_migration.sql
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS receive_alerts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receive_daily_reports BOOLEAN DEFAULT false;
```

6. Click **Run**
7. Update your admin account:

```sql
UPDATE admin_users
SET email = 'bryan.hurren@gmail.com',
    receive_daily_reports = true,
    receive_alerts = true
WHERE username = 'master';
```

8. Click **Run**

#### Step 1.2: Create daily_metrics Table

1. Still in **SQL Editor**, create a new query
2. Copy and paste the contents of `daily_metrics_migration.sql`:

```sql
-- From: CitizenshipQuizWeb/daily_metrics_migration.sql
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  new_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  revenue_usd DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);

-- (Include the full SQL from the file)
```

3. Click **Run**

---

### Task 2: Set Up SendGrid

#### Step 2.1: Create SendGrid Account

1. Go to https://sendgrid.com/pricing
2. Sign up for **Free Plan** (100 emails/day, no credit card required)
3. Verify your email address

#### Step 2.2: Create API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `CitizenshipQuiz Daily Reports`
4. Permission: **Full Access** (or at minimum: Mail Send)
5. Click **Create & View**
6. **Copy the API key** (you won't be able to see it again!)

#### Step 2.3: Verify Sender Email

SendGrid requires you to verify the email address you'll send from:

**Option A: Single Sender Verification (Easiest)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill out the form:
   - **From Name**: CitizenshipQuiz App
   - **From Email Address**: bryan.hurren@gmail.com (or a dedicated email)
   - **Reply To**: Same as from email
   - **Company**: Your company name
   - **Address**: Your address
4. Click **Create**
5. Check your email for verification link
6. Click the verification link

**Option B: Domain Authentication (Professional)**
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions for your domain

#### Step 2.4: Add Environment Variables to Vercel

1. Go to https://vercel.com/dashboard
2. Select your project (`claude-test`)
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `SENDGRID_API_KEY` | `SG.xxxxxxxxxxxxx` (from Step 2.2) | Production, Preview, Development |
| `SENDGRID_FROM_EMAIL` | `bryan.hurren@gmail.com` (verified email) | Production, Preview, Development |
| `ADMIN_EMAIL` | `bryan.hurren@gmail.com` (fallback recipient) | Production, Preview, Development |

5. Click **Save** for each

---

### Task 3: Test the Daily Report

#### Step 3.1: Manual Test (Before Redeploy)

The environment variables won't be active until you redeploy. Test the endpoint to see graceful fallback:

```bash
curl "https://www.theeclodapps.com/api/generate-daily-report?secret=temp-fix-2025"
```

Expected response (without SendGrid configured):
```json
{
  "success": true,
  "message": "Metrics collected but SendGrid not configured",
  "metrics": {
    "date": "2025-10-25",
    "new_users": 0,
    "total_users": 2,
    ...
  }
}
```

#### Step 3.2: Redeploy with Environment Variables

```bash
cd /Users/bryanhurren/Documents/claude-test
./deploy.sh
```

#### Step 3.3: Test Email Sending

After redeployment:

```bash
curl "https://www.theeclodapps.com/api/generate-daily-report?secret=temp-fix-2025"
```

Expected response (with SendGrid configured):
```json
{
  "success": true,
  "message": "Daily report generated and sent",
  "metrics": { ... },
  "recipients": ["bryan.hurren@gmail.com"]
}
```

**Check your email!** You should receive a formatted daily report.

---

### Task 4: Test Health Endpoint

```bash
curl https://www.theeclodapps.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T...",
  "latency": 250,
  "checks": {
    "supabase": {"status": "healthy", "latency": 230},
    "claude": {"status": "healthy", "message": "API key configured"},
    "stripe": {"status": "healthy", "message": "API keys configured"}
  },
  "environment": "production"
}
```

---

### Task 5: Set Up BetterUptime (Optional)

#### Step 5.1: Create Account

1. Go to https://betteruptime.com
2. Sign up for free plan
3. Verify your email

#### Step 5.2: Create Monitors

**Monitor 1: Main Website**
- **URL**: `https://www.theeclodapps.com`
- **Request Type**: GET
- **Check Frequency**: Every 3 minutes
- **Expected Status Code**: 200
- **Name**: CitizenshipQuiz - Main Site

**Monitor 2: Health Endpoint**
- **URL**: `https://www.theeclodapps.com/api/health`
- **Request Type**: GET
- **Check Frequency**: Every 5 minutes
- **Expected Status Code**: 200
- **Expected Response**: Contains `"status":"healthy"`
- **Name**: CitizenshipQuiz - Health Check

#### Step 5.3: Configure Alerts

1. Go to **Escalation Policies**
2. Click **Create Escalation Policy**
3. Name: CitizenshipQuiz Alerts
4. Add your email: bryan.hurren@gmail.com
5. Notification delay: Immediate
6. Escalation: After 5 minutes

#### Step 5.4: Apply to Monitors

1. Go back to your monitors
2. Edit each monitor
3. Set **Escalation Policy**: CitizenshipQuiz Alerts
4. Save

---

## 🔄 Automated Daily Reports

### How It Works

1. **Cron Schedule**: Every day at 8:00 AM UTC (configured in `vercel.json`)
2. **Metrics Collected**:
   - New users (yesterday)
   - Total users
   - Active users (logged in yesterday)
   - New subscriptions (started yesterday)
   - Active subscriptions (currently active)
   - Revenue (estimated: $0.99 per new subscription)
3. **Database Storage**: Metrics saved to `daily_metrics` table
4. **Email Sent**: To all admins with `receive_daily_reports = true`
5. **Fallback**: If no admins configured, sends to `ADMIN_EMAIL` env var

### Cron Limitations

⚠️ **Vercel Hobby Plan Limitation**: Cron jobs require a Pro plan.

**Workarounds:**
1. **Manual Trigger**: Run this daily yourself:
   ```bash
   curl "https://www.theeclodapps.com/api/generate-daily-report?secret=temp-fix-2025"
   ```

2. **External Cron Service** (Free):
   - Sign up at https://cron-job.org
   - Create job:
     - URL: `https://www.theeclodapps.com/api/generate-daily-report?secret=temp-fix-2025`
     - Schedule: Daily at 8:00 AM
     - Method: GET

3. **Upgrade to Vercel Pro**: $20/month (includes cron jobs)

---

## 📊 Accessing Reports

### Via Email (Daily)
- Automated HTML email with metrics
- Sent to all admins with `receive_daily_reports = true`

### Via API (On-Demand)
```bash
curl "https://www.theeclodapps.com/api/generate-daily-report?secret=temp-fix-2025"
```

### Via Database Query
```sql
SELECT * FROM daily_metrics
ORDER BY date DESC
LIMIT 30;
```

---

## 🔧 Troubleshooting

### Email Not Sending

1. **Check SendGrid API Key**:
   ```bash
   # Verify env var is set in Vercel
   vercel env ls
   ```

2. **Check SendGrid Activity**:
   - Go to SendGrid dashboard
   - Click **Activity**
   - Look for failed sends or errors

3. **Check Vercel Logs**:
   ```bash
   vercel logs --follow
   ```

   Then trigger the report:
   ```bash
   curl "https://www.theeclodapps.com/api/generate-daily-report?secret=temp-fix-2025"
   ```

4. **Common Issues**:
   - ❌ Sender email not verified → Verify in SendGrid
   - ❌ Wrong API key → Check env var matches SendGrid
   - ❌ No recipients configured → Update admin_users table
   - ❌ SendGrid free tier limit (100/day) exceeded → Wait until next day or upgrade

### Cron Job Not Running

1. **Check if on Pro Plan**:
   ```bash
   vercel teams ls
   ```

   If you see "Hobby" → Cron jobs won't run automatically

2. **Use External Cron Service** (see workaround above)

### Health Endpoint Showing Degraded/Unhealthy

1. **Check Supabase**:
   - Is database accessible?
   - Check Supabase dashboard for incidents

2. **Check API Keys**:
   - Verify all env vars are set in Vercel

3. **Check Response**:
   ```bash
   curl https://www.theeclodapps.com/api/health | jq
   ```

   Look at the `checks` object for specific failures

---

## ✅ Verification Checklist

Before marking this as complete:

- [ ] Run `admin_email_migration.sql` in Supabase
- [ ] Run `daily_metrics_migration.sql` in Supabase
- [ ] Update admin email in database
- [ ] Create SendGrid account
- [ ] Generate SendGrid API key
- [ ] Verify sender email in SendGrid
- [ ] Add `SENDGRID_API_KEY` to Vercel
- [ ] Add `SENDGRID_FROM_EMAIL` to Vercel
- [ ] Add `ADMIN_EMAIL` to Vercel
- [ ] Redeploy after adding env vars
- [ ] Test health endpoint (should return 200)
- [ ] Test daily report endpoint (should send email)
- [ ] Receive test email successfully
- [ ] (Optional) Set up BetterUptime monitors
- [ ] (Optional) Set up external cron service

---

## 📁 Files Reference

**Database Migrations:**
- `CitizenshipQuizWeb/admin_email_migration.sql`
- `CitizenshipQuizWeb/daily_metrics_migration.sql`

**API Endpoints:**
- `CitizenshipQuizWeb/api/health.js`
- `CitizenshipQuizWeb/api/generate-daily-report.js`
- `CitizenshipQuizWeb/api/check-subscription-health.js`

**Configuration:**
- `CitizenshipQuizWeb/vercel.json` (cron job config)

---

## 🎯 Next Steps After Setup

1. **Monitor First Week**: Check daily emails arrive
2. **Review Metrics**: Look for trends in user growth
3. **Set Up Alerts**: Create subscription health alerts
4. **Consider Upgrade**: Evaluate Pro plan for automated crons

---

**Questions?** All endpoints are deployed and ready. Just need to complete the SendGrid setup!
