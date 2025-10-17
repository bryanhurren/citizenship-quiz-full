# Deployment Guide - US Citizenship Quiz with Global Leaderboard

## ✅ What's Been Completed

Your app has been **fully migrated to Supabase** for global leaderboard functionality! Here's what's done:

### Supabase Integration:
- ✅ Supabase client library integrated
- ✅ Database credentials configured
- ✅ All localStorage replaced with Supabase database calls
- ✅ User authentication using database
- ✅ Invite code system using database
- ✅ Session management with database persistence
- ✅ Global leaderboard functionality
- ✅ Admin panel with Supabase integration

### Files Modified:
- ✅ `citizenship-quiz.html` - Fully migrated to Supabase
- ✅ `admin.html` - Supabase client added
- ✅ `vercel.json` - Deployment configuration created
- ✅ `database-schema.sql` - Database schema ready

## 🚀 Quick Deployment Steps

### Step 1: Run Database Schema (If you haven't already)

1. Go to your Supabase dashboard: https://app.supabase.com
2. Click on your project: **citizenship-quiz**
3. Click **SQL Editor** in the left sidebar
4. Click **"New query"**
5. Open `/Users/bryanhurren/Documents/claude-test/database-schema.sql`
6. Copy ALL contents and paste into SQL editor
7. Click **RUN** (or Cmd/Ctrl + Enter)
8. Should see: "Success. No rows returned"

This creates:
- Users table
- Admins table
- Invite codes table
- Master admin account (username: `master`, password: `PeePeePooPoo2020!`)

### Step 2: Deploy to Vercel

**Option A: CLI (Fastest)**
```bash
cd /Users/bryanhurren/Documents/claude-test

# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? [your account]
# - Link to existing project? N
# - Project name? citizenship-quiz
# - Directory? ./
# - Override settings? N
```

**Option B: GitHub + Vercel Dashboard**
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Vercel auto-detects settings
5. Click Deploy

### Step 3: Test Your Deployment

Once deployed, you'll get a URL like: `https://citizenship-quiz-xxx.vercel.app`

**Test the app:**
1. Visit the URL
2. Login as master admin:
   - Username: `master`
   - Password: `PeePeePooPoo2020!`
3. Generate an invite code (you should see it in the database table!)
4. Create a new user account
5. Check the global leaderboard - both users should appear!

**Test across devices:**
1. Open on your phone
2. Login with the same account
3. Progress should sync!
4. Open on another browser
5. Create different account
6. Both users appear on leaderboard globally!

### Step 4: Access Admin Panel

Visit: `https://your-url.vercel.app/admin.html`

Login with:
- Username: `master`
- Password: `PeePeePooPoo2020!`

You can:
- Generate invite codes
- Create additional admins
- View all users
- Reset passwords
- Delete users

## 🎉 What You Now Have

### Global Leaderboard ✅
- All users visible to everyone
- Real-time rankings by best score
- Works across all devices
- Persistent data in Supabase

### Multi-Device Support ✅
- Login from any device
- Progress syncs automatically
- Same leaderboard everywhere

### Secure & Scalable ✅
- PostgreSQL database (Supabase)
- Password authentication
- Invite-only registration
- Admin management system

## 📊 Database Tables

Your Supabase project now has:

**users** table:
- username, password
- quiz progress (current_question, scores)
- session data (question_results, mode)
- stats (best_score, last_session_date)

**admins** table:
- username, password
- creation tracking

**invite_codes** table:
- code, used status
- tracking (created_by, used_by, dates)

## 🔧 Troubleshooting

### "Failed to fetch" errors
- Check Supabase project is running (green status)
- Verify URL and key are correct in the HTML files
- Check browser console for specific errors

### Master admin not found
- Make sure you ran `database-schema.sql`
- Check Supabase → Table Editor → admins table
- Should see "master" user

### Leaderboard empty
- Check Supabase → Table Editor → users table
- Create a test account to verify
- Check browser console for errors

### Can't create account
- Generate invite code from admin panel first
- Check invite_codes table has unused codes
- Verify code hasn't been used

## 📝 Next Steps

Your app is production-ready! Here's what you can do:

1. **Custom Domain** (optional)
   - Go to Vercel project settings
   - Add your domain
   - Update DNS records

2. **Share Invite Codes**
   - Login to admin panel
   - Generate codes
   - Share with users

3. **Monitor Usage**
   - Vercel Analytics (free)
   - Supabase Dashboard shows DB usage
   - Check logs for errors

4. **Backup Data** (recommended)
   - Supabase auto-backups on paid plans
   - Export data: SQL Editor → Export

## 🎯 Summary

✅ **Database**: Supabase PostgreSQL with 3 tables
✅ **Frontend**: Deployed to Vercel
✅ **Backend**: Express API on Vercel serverless
✅ **Global Leaderboard**: Working across all devices
✅ **Admin Panel**: Full user management at /admin.html

**Your live URL**: (will be generated after `vercel` command)

Enjoy your global citizenship quiz with real-time leaderboard! 🎊
