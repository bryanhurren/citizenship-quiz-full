# OAuth Setup Guide - Apple & Google Sign-In

## Overview

The app has been updated to use **OAuth-only authentication** with Apple Sign-In and Google Sign-In. Username/password login has been completely removed.

## ✅ What's Already Implemented

- OAuth dependencies installed (`expo-apple-authentication`, `@react-native-google-signin/google-signin`)
- LoginScreen refactored to show only OAuth buttons
- Invite code validation flow after OAuth sign-in
- Welcome modal on first load when not logged in
- Auto-redirect to "You" tab when not logged in
- Apple Sign-In button (iOS only)
- Google Sign-In button (all platforms)

## 🔧 Required Setup Steps

### 1. Apple Sign-In Setup (iOS)

#### Prerequisites:
- ✅ Apple Developer Account ($99/year) - **REQUIRED**
- ✅ Xcode installed
- ✅ Team ID from Apple Developer portal

#### Step 1: Update Bundle Identifier
1. Go to `app.json`
2. Update `"bundleIdentifier": "com.yourcompany.citizenshipquiz"` to your actual bundle ID
3. Make it unique (e.g., `com.yourname.citizenshipquiz`)

#### Step 2: Enable Sign in with Apple
1. Go to https://developer.apple.com/account
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select your App ID (or create one with your bundle identifier)
4. Enable **Sign in with Apple** capability
5. Save and confirm

#### Step 3: Test on iOS Simulator
```bash
npx expo run:ios
```

**Note:** Apple Sign-In works on physical iOS devices and iOS Simulator (iOS 13+). It will NOT work on web or Android.

---

### 2. Google Sign-In Setup (All Platforms)

#### Prerequisites:
- Google Cloud Console account (free)
- Project created in Google Cloud Console

#### Step 1: Create OAuth Credentials

1. **Go to Google Cloud Console:**
   - Visit https://console.cloud.google.com/
   - Create a new project (or select existing)

2. **Enable Google Sign-In API:**
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Sign-In API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**

4. **Configure OAuth Consent Screen:**
   - Click **Configure Consent Screen**
   - Select **External** (unless you have Google Workspace)
   - Fill in:
     - App name: "Citizenship Quiz App"
     - User support email: your email
     - Developer contact: your email
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue

5. **Create Web Client ID:**
   - Go back to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: "Citizenship Quiz Web Client"
   - Click **Create**
   - **COPY THE CLIENT ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

6. **Create iOS Client ID** (optional, for iOS):
   - Application type: **iOS**
   - Name: "Citizenship Quiz iOS"
   - Bundle ID: same as in `app.json` (e.g., `com.yourcompany.citizenshipquiz`)

7. **Create Android Client ID** (optional, for Android):
   - Application type: **Android**
   - Name: "Citizenship Quiz Android"
   - Package name: same as in `app.json` (e.g., `com.yourcompany.citizenshipquiz`)
   - Get SHA-1 certificate fingerprint:
     ```bash
     keytool -keystore ~/.android/debug.keystore -list -v
     # Default password: android
     ```

#### Step 2: Update App Configuration

1. Open `App.tsx`
2. Find this line:
   ```typescript
   webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
   ```
3. Replace with your actual Web Client ID from step 1.5 above

#### Step 3: Test Google Sign-In
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Web (may have limitations)
npx expo start --web
```

---

### 3. Supabase Configuration (Optional but Recommended)

If you want to store OAuth tokens and manage sessions in Supabase:

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Navigate to **Authentication** → **Providers**

2. **Enable Apple Provider:**
   - Toggle on **Apple**
   - Services ID: from Apple Developer Console
   - Save

3. **Enable Google Provider:**
   - Toggle on **Google**
   - Client ID: your Google Web Client ID
   - Client Secret: from Google Cloud Console
   - Save

4. **Update Supabase Service:**
   - Modify `src/services/supabase.ts` to use Supabase Auth instead of custom auth
   - Use `supabase.auth.signInWithOAuth()` methods

---

## 🧪 Testing Checklist

### Apple Sign-In (iOS only):
- [ ] Runs on iOS Simulator without errors
- [ ] Apple Sign-In button appears
- [ ] Clicking button shows Apple authentication dialog
- [ ] After authentication, invite code prompt appears (for new users)
- [ ] After entering valid invite code, user is created and logged in
- [ ] Existing users can sign in without invite code

### Google Sign-In (All platforms):
- [ ] Runs on iOS/Android/Web
- [ ] Google Sign-In button appears
- [ ] Clicking button opens Google authentication
- [ ] After authentication, invite code prompt appears (for new users)
- [ ] After entering valid invite code, user is created and logged in
- [ ] Existing users can sign in without invite code

### Authentication Flow:
- [ ] First load shows welcome modal when not logged in
- [ ] App redirects to "You" tab when not logged in
- [ ] Welcome modal is dismissable
- [ ] After login, user can access quiz features
- [ ] Logout works properly
- [ ] Session persists after app restart

---

## 🚨 Troubleshooting

### Apple Sign-In Issues:

**Error: "Sign in with Apple is not available"**
- Ensure you're on iOS 13+ (Simulator or device)
- Check bundle identifier matches Apple Developer portal
- Verify "Sign in with Apple" capability is enabled

**Error: "Invalid client"**
- Bundle identifier mismatch
- Sign in with Apple not enabled in Apple Developer portal

### Google Sign-In Issues:

**Error: "DEVELOPER_ERROR"**
- Web Client ID is incorrect or not configured
- SHA-1 fingerprint mismatch (Android)
- Bundle ID/Package name mismatch

**Error: "SIGN_IN_CANCELLED"**
- User cancelled the sign-in (not an error)

**Error: "PLAY_SERVICES_NOT_AVAILABLE"**
- Android only - Google Play Services not installed
- Test on a real device or use an emulator with Play Store

---

## 📱 Platform-Specific Notes

### iOS:
- Apple Sign-In works on iOS Simulator (iOS 13+) and physical devices
- Apple Sign-In button automatically styled per Apple guidelines
- Requires Apple Developer account to deploy to App Store

### Android:
- Google Sign-In requires Google Play Services
- SHA-1 fingerprint required for production builds
- Works on emulators with Google Play Store

### Web:
- Apple Sign-In NOT available on web
- Google Sign-In works but may have limitations
- Consider using popup mode instead of redirect

---

## 📋 Next Steps

1. **Get Apple Developer Account** ($99/year)
   - https://developer.apple.com/programs/

2. **Set up Google OAuth Credentials** (free)
   - https://console.cloud.google.com/

3. **Update Configuration:**
   - Bundle identifier in `app.json`
   - Google Web Client ID in `App.tsx`

4. **Test on Simulators:**
   ```bash
   npx expo run:ios
   npx expo run:android
   ```

5. **Optional: Integrate Supabase Auth**
   - Better session management
   - Built-in OAuth token refresh
   - Cross-device session sync

---

## 🔗 Useful Resources

- **Expo Apple Authentication:** https://docs.expo.dev/versions/latest/sdk/apple-authentication/
- **React Native Google Sign-In:** https://github.com/react-native-google-signin/google-signin
- **Google Cloud Console:** https://console.cloud.google.com/
- **Apple Developer Portal:** https://developer.apple.com/account/
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth

---

## ✨ Summary of Changes

### What Changed:
1. ❌ Removed username/password login completely
2. ✅ Added Apple Sign-In (iOS only)
3. ✅ Added Google Sign-In (all platforms)
4. ✅ Invite code required for new user registration
5. ✅ Welcome modal on first load
6. ✅ Auto-redirect to "You" tab when not logged in

### User Flow:
1. User opens app → sees welcome modal → dismisses
2. App shows "You" tab (profile/login screen)
3. User clicks "Continue with Apple" or "Continue with Google"
4. OAuth provider authenticates user
5. **IF NEW USER:** App prompts for invite code
6. **IF EXISTING USER:** User is logged in immediately
7. After successful authentication → user can start quiz

---

**Current Status:** OAuth implementation complete! Just needs developer account credentials to fully test and deploy.
