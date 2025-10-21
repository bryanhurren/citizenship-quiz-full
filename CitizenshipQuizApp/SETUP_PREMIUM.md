# Premium Features Setup Guide

This guide will help you complete the setup for premium subscription features and push notifications.

## Overview

The following features have been implemented:
- ✅ Daily question limit (5 questions for free users)
- ✅ Premium tier bypass (unlimited questions)
- ✅ Subscription tier display in profile
- ✅ Upgrade modal with benefits and pricing
- ✅ Trophy badge for premium users
- ✅ Admin upgrade interface
- ✅ Daily reminder notification toggle
- ✅ Push notification infrastructure
- ⚠️  Apple In-App Purchase integration (requires configuration)

## Required Configuration Steps

### 1. RevenueCat Setup

RevenueCat handles subscription management across iOS and Android platforms.

#### Step 1.1: Create RevenueCat Account
1. Go to https://app.revenuecat.com
2. Sign up for a free account
3. Create a new project

#### Step 1.2: Configure App Store Connect
1. Create a new In-App Purchase subscription in App Store Connect:
   - Product ID: `weekly_premium_subscription` (or your preferred ID)
   - Price: $0.99/week
   - Subscription duration: 1 week
   - Auto-renewable: Yes

#### Step 1.3: Connect RevenueCat to App Store Connect
1. In RevenueCat dashboard, go to Project Settings
2. Select "iOS" platform
3. Add your bundle ID: `com.bryanhurren.citizenshipquiz`
4. Upload your App Store Connect API key
5. Create an entitlement called `premium`
6. Attach your weekly subscription product to the `premium` entitlement

#### Step 1.4: Get API Keys
1. In RevenueCat dashboard, go to API Keys
2. Copy the **iOS API Key**
3. Update `src/services/purchases.ts`:
   ```typescript
   const REVENUECAT_API_KEY = Platform.select({
     ios: 'YOUR_ACTUAL_IOS_API_KEY', // Replace this
     android: 'YOUR_ANDROID_API_KEY',
   });
   ```

### 2. Expo Push Notifications Setup

#### Step 2.1: Get Expo Project ID
1. Run: `npx expo whoami` to verify you're logged in
2. If not logged in, run: `npx expo login`
3. Get your project ID from `app.json` or create one:
   ```bash
   npx expo install expo-dev-client
   ```

#### Step 2.2: Configure Expo Notifications
1. Update `src/services/notifications.ts`:
   ```typescript
   const pushToken = await Notifications.getExpoPushTokenAsync({
     projectId: 'your-project-id-here', // Get from app.json extra.eas.projectId
   });
   ```

#### Step 2.3: iOS Push Notification Certificates
1. Enable push notifications in your Apple Developer account
2. Create an APNs key in Apple Developer Portal
3. Upload the APNs key to Expo:
   ```bash
   npx expo credentials:manager
   ```

### 3. Testing In-App Purchases

#### Step 3.1: Sandbox Testing
1. Create a sandbox tester account in App Store Connect
2. Sign out of your real Apple ID on your test device
3. Build and install the app
4. When prompted for Apple ID, use your sandbox tester account
5. Test the purchase flow

#### Step 3.2: Verify Purchase
1. After purchase, check the user's subscription tier in the profile
2. Verify the trophy badge appears on the avatar
3. Test that the daily question limit is removed
4. Check the admin interface shows premium status

### 4. Testing Notifications

#### Step 4.1: Test Notification Toggle
1. Open the app and navigate to the "You" tab
2. Toggle on "Daily Reminder"
3. Grant notification permissions when prompted
4. Verify the toggle stays enabled

#### Step 4.2: Test Notification Delivery
1. Wait for the scheduled time (default: 9 AM daily)
2. Or use Expo's push notification testing tools:
   ```bash
   npx expo send --to <push-token>
   ```

### 5. Database Fields Verification

Ensure your Supabase `users` table has these fields:

```sql
-- Premium tier fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(10) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS questions_answered_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS questions_reset_at TIMESTAMP;
```

### 6. Production Checklist

Before releasing to production:

- [ ] RevenueCat API keys configured
- [ ] App Store Connect subscription product created
- [ ] RevenueCat entitlement mapped to product
- [ ] Expo project ID added to notification service
- [ ] APNs certificate uploaded to Expo
- [ ] Tested sandbox purchases
- [ ] Tested notification delivery
- [ ] Database fields created
- [ ] Admin interface tested
- [ ] Privacy policy updated with subscription terms
- [ ] App Store listing includes subscription details

### 7. Troubleshooting

#### Purchases not working
- Check RevenueCat API key is correct
- Verify bundle ID matches in all systems
- Ensure product is "Ready to Submit" in App Store Connect
- Check sandbox tester is signed in

#### Notifications not working
- Verify notification permissions granted
- Check Expo project ID is correct
- Ensure APNs certificate is uploaded
- Check device is not in Do Not Disturb mode

#### Daily limit not resetting
- Check `questions_reset_at` field in database
- Verify timezone is correctly handled
- Ensure `checkDailyLimit()` is called on app load

### 8. Monitoring and Analytics

#### RevenueCat Dashboard
- Monitor active subscriptions
- Track revenue
- View cancellation rates
- Export customer data

#### Expo Push Notification Dashboard
- Track notification delivery rates
- Monitor error rates
- View notification receipts

### 9. Support and Resources

- RevenueCat Docs: https://docs.revenuecat.com
- Expo Notifications: https://docs.expo.dev/push-notifications/overview/
- App Store Connect: https://appstoreconnect.apple.com
- Supabase Docs: https://supabase.com/docs

### 10. Manual Testing Without IAP

For testing without configuring IAP:
1. Use the admin interface at http://localhost:3000/admin.html
2. Click "Upgrade" next to any user
3. Enter number of weeks (e.g., 4)
4. Verify premium features activate immediately
5. Check trophy badge appears
6. Test unlimited question access

This allows you to test all premium features while you set up the actual IAP integration.

## Files Modified

The following files were created or modified for this feature:

### New Files
- `src/services/notifications.ts` - Push notification service
- `src/services/purchases.ts` - RevenueCat integration
- `src/components/UpgradeModal.tsx` - Upgrade dialog
- `SETUP_PREMIUM.md` - This setup guide

### Modified Files
- `src/types/index.ts` - Added subscription types
- `src/services/supabase.ts` - Added daily limit functions
- `src/store/quizStore.ts` - Added premium methods
- `src/screens/QuizScreen.tsx` - Added paywall
- `src/screens/ProfileScreen.tsx` - Added subscription UI and notification toggle
- `src/navigation/AppNavigator.tsx` - Added friendly icons
- `src/components/index.ts` - Exported new components
- `admin.html` - Added subscription management
- `app.json` - Added notification configuration

## Next Steps

1. Complete RevenueCat setup (steps 1.1-1.4 above)
2. Configure Expo push notifications (steps 2.1-2.3 above)
3. Test purchases in sandbox mode
4. Test notifications
5. Deploy to TestFlight for beta testing
6. Submit to App Store

For immediate testing, use the admin interface to manually upgrade users and test premium features.
