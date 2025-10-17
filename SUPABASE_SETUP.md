# Supabase Setup Guide

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project:
   - **Project name**: citizenship-quiz
   - **Database password**: (choose a strong password - save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free

## Step 2: Run Database Schema

1. Wait for your project to finish setting up (~2 minutes)
2. In your Supabase dashboard, click **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Copy the entire contents of `database-schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
7. You should see "Success. No rows returned"

## Step 3: Get Your Credentials

1. Go to **Settings** > **API** (left sidebar)
2. Find these two values:
   - **Project URL** (looks like: https://abcdefgh.supabase.co)
   - **anon public** key (starts with: eyJ...)

3. Copy both values - you'll need them!

## Step 4: Add Credentials to Your App

### Option A: Environment Variables (Recommended for production)

Create a `.env` file in your project root:

```bash
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
```

### Option B: Direct in citizenship-quiz.html (Quick testing)

Open `citizenship-quiz.html` and find the `<script>` section at the bottom.
Add these lines at the very top of the script:

```javascript
const SUPABASE_URL = 'your_project_url_here';
const SUPABASE_ANON_KEY = 'your_anon_key_here';
```

## Step 5: Test the Database

1. Open `citizenship-quiz.html` in your browser
2. Open browser console (F12 or Cmd+Option+I)
3. You should NOT see any Supabase errors
4. Try creating a new account - it should work!
5. Check your Supabase dashboard > **Table Editor** > **users** table
6. You should see your new user!

## Step 6: Verify Global Leaderboard

1. Open the app in Chrome
2. Create an account and take the quiz
3. Open the app in Firefox (or incognito)
4. Create a different account
5. Both users should appear on the leaderboard!
6. Refresh the page - data persists!

## Troubleshooting

### "Failed to fetch" error
- Check your internet connection
- Verify URL and key are correct
- Check Supabase project is running (green status in dashboard)

### "Row Level Security" error
- Make sure you ran the database-schema.sql
- Check that RLS policies were created

### Users not appearing
- Open browser console for errors
- Check Supabase dashboard > Logs for errors
- Verify the table exists: Dashboard > Table Editor > users

## Master Admin Login

After setup, you can login with:
- **Username**: master
- **Password**: PeePeePooPoo2020!

Go to `/admin.html` to access the admin panel.
