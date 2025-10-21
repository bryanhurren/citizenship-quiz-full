# Deployment Guide - US Citizenship Quiz Mobile App

## 🌐 Web Deployment (Vercel)

### **Quick Deploy (5 minutes)**

1. **Build the web version:**
   ```bash
   cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp
   npx expo export:web
   ```

2. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI (if not installed)
   npm install -g vercel

   # Deploy
   cd web-build
   vercel
   ```

3. **Follow prompts:**
   - Set up and deploy: Yes
   - Which scope: Your account
   - Link to existing project: No
   - Project name: citizenship-quiz-mobile (or your choice)
   - Directory: ./
   - Override settings: No

4. **Done!** You'll get a URL like: `https://citizenship-quiz-mobile.vercel.app`

### **Alternative: Vercel Dashboard**

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repo (if pushed to GitHub)
4. Set build command: `npx expo export:web`
5. Set output directory: `web-build`
6. Deploy

---

## 📱 iOS Deployment (App Store)

### **Prerequisites:**
- ✅ Xcode installed (you have this)
- ⏳ Apple Developer Account ($99/year) - **NEED TO GET**
- ⏳ Apple Developer Team ID

### **Step 1: Get Apple Developer Account**
1. Go to https://developer.apple.com/programs/
2. Enroll ($99/year)
3. Wait for approval (1-2 days)
4. Get your Team ID from https://developer.apple.com/account

### **Step 2: Configure EAS Build**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure the project
eas build:configure
```

This creates `eas.json` configuration file.

### **Step 3: Build iOS App**

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# Or build for internal testing first
eas build --platform ios --profile preview
```

This will:
- Upload your code to Expo servers
- Build the iOS app in the cloud
- Give you an `.ipa` file to download

### **Step 4: Test on iOS Simulator (Local)**

Before building for App Store, test locally:

```bash
# Start Expo and open iOS Simulator
npx expo start --ios
```

This requires Xcode to be configured with a simulator.

### **Step 5: Submit to App Store**

```bash
# Submit to App Store
eas submit --platform ios
```

You'll need:
- Apple ID
- App-specific password
- Bundle identifier (e.g., com.yourname.citizenshipquiz)

### **Step 6: App Store Connect**

1. Go to https://appstoreconnect.apple.com
2. Create new app listing
3. Add screenshots, description, etc.
4. Submit for review
5. Wait for approval (1-7 days typically)

---

## 🤖 Android Deployment (Google Play)

### **Prerequisites:**
- ✅ Android Studio installed (you have this)
- ⏳ Google Play Developer Account ($25 one-time) - **NEED TO GET**

### **Step 1: Get Google Play Developer Account**
1. Go to https://play.google.com/console/signup
2. Pay $25 one-time fee
3. Complete registration
4. Wait for approval (usually instant)

### **Step 2: Build Android App**

```bash
# Build for Google Play
eas build --platform android --profile production

# Or build APK for testing
eas build --platform android --profile preview
```

This gives you an `.aab` (Android App Bundle) or `.apk` file.

### **Step 3: Test on Android Emulator (Local)**

Before building for Play Store, test locally:

```bash
# Start Expo and open Android Emulator
npx expo start --android
```

This requires Android Studio emulator to be configured.

### **Step 4: Submit to Google Play**

```bash
# Submit to Google Play
eas submit --platform android
```

Or manually:
1. Go to https://play.google.com/console
2. Create new app
3. Upload the `.aab` file
4. Fill in store listing (screenshots, description)
5. Submit for review
6. Wait for approval (typically 1-3 days)

---

## 🔐 Native OAuth Setup (After Developer Accounts)

### **Apple Sign-In Setup**

1. **Enable in Apple Developer:**
   - Go to https://developer.apple.com/account
   - Certificates, Identifiers & Profiles
   - Enable "Sign in with Apple" for your app identifier

2. **Configure in Supabase:**
   - Go to Supabase dashboard → Authentication → Providers
   - Enable Apple provider
   - Add your Services ID

3. **Update app code:**
   - Install: `npx expo install expo-apple-authentication`
   - Replace OAuth placeholder in `LoginScreen.tsx`

### **Google Sign-In Setup**

1. **Create OAuth credentials:**
   - Go to https://console.cloud.google.com
   - Create new project
   - Enable Google Sign-In API
   - Create OAuth 2.0 credentials

2. **Configure in Supabase:**
   - Supabase dashboard → Authentication → Providers
   - Enable Google provider
   - Add your Client ID and Secret

3. **Update app code:**
   - Install: `npx expo install @react-native-google-signin/google-signin`
   - Replace OAuth placeholder in `LoginScreen.tsx`

---

## 🧪 Testing Checklist

### **Before Production Deployment:**

- [ ] Test complete quiz flow (all 100/128 questions)
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Test on iOS Simulator
- [ ] Test on Android Emulator
- [ ] Test on physical iPhone (via Expo Go app)
- [ ] Test on physical Android device (via Expo Go app)
- [ ] Verify all API calls work (AI evaluation)
- [ ] Check Supabase database connections
- [ ] Test session persistence (close/reopen app)
- [ ] Test logout/login flow
- [ ] Verify pass/fail thresholds
- [ ] Check retry logic in both modes
- [ ] Test with slow network (throttle to 3G)
- [ ] Check for memory leaks (long quiz sessions)

---

## 📊 Estimated Timeline

### **Web Only (Fastest):**
- Test & polish: 1-2 hours
- Deploy to Vercel: 15 minutes
- **Total: ~2 hours** ✅ **Can do today!**

### **iOS Added:**
- Get Apple Developer account: 1-2 days (approval)
- Configure & test: 2-3 hours
- Build & submit: 1 hour
- App Store review: 1-7 days
- **Total: ~3-10 days**

### **Android Added:**
- Get Google Play account: Instant
- Configure & test: 2-3 hours
- Build & submit: 1 hour
- Play Store review: 1-3 days
- **Total: ~1-4 days**

### **Native OAuth Added:**
- Setup Apple Sign-In: 2-3 hours
- Setup Google Sign-In: 2-3 hours
- Test & debug: 2-3 hours
- **Total: ~6-9 hours**

---

## 💰 Costs Summary

| Item | Cost | Frequency |
|------|------|-----------|
| **Web Hosting (Vercel)** | FREE (Hobby tier) | Forever |
| **Supabase Database** | FREE (up to 500MB) | Monthly |
| **Apple Developer** | $99 | Yearly |
| **Google Play Developer** | $25 | One-time |
| **Expo EAS Build** | FREE (1 build/day) or $29/mo | Monthly |
| **Backend API (Vercel)** | FREE (existing) | Forever |

**Minimum to start:** $0 (web only)
**Full deployment:** $124 first year, $99/year after

---

## 🚀 Recommended Path

### **Option A: Web First (Recommended)**
1. Deploy web version to Vercel TODAY
2. Test with real users
3. Get feedback
4. Then decide if mobile apps are needed

### **Option B: Full Multi-Platform**
1. Get Apple & Google accounts
2. Test on simulators/emulators
3. Build for all platforms
4. Submit simultaneously
5. Launch everywhere at once

### **Option C: iOS First, Then Android**
1. Get Apple Developer account
2. Launch on App Store
3. Test with iOS users
4. Then add Android

---

## 📝 Configuration Files

### **app.json** (Already configured)
```json
{
  "expo": {
    "name": "CitizenshipQuizApp",
    "slug": "CitizenshipQuizApp",
    "platforms": ["ios", "android", "web"],
    "ios": {
      "bundleIdentifier": "com.yourname.citizenshipquiz"
    },
    "android": {
      "package": "com.yourname.citizenshipquiz"
    }
  }
}
```

### **eas.json** (Create when ready)
```json
{
  "build": {
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

---

## 🐛 Troubleshooting

### **Web build fails:**
```bash
# Clear cache
npx expo start --clear
rm -rf node_modules
npm install
```

### **iOS build fails:**
- Check Apple Developer account is active
- Verify Team ID in `app.json`
- Ensure bundle identifier is unique

### **Android build fails:**
- Check package name is unique
- Verify Play Store account is active
- Make sure signing keys are configured

---

## 📞 Support Resources

- **Expo Docs:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **App Store Review:** https://developer.apple.com/app-store/review/
- **Play Store Console:** https://support.google.com/googleplay/android-developer/

---

## ✅ What's Done

- ✅ Complete React Native app (iOS + Android + Web)
- ✅ All 5 screens implemented
- ✅ AI evaluation integrated
- ✅ Supabase authentication
- ✅ Session persistence
- ✅ 2008 & 2025 test versions
- ✅ Formal & Comedy modes
- ✅ Web dependencies installed
- ✅ App running locally

## ⏳ What's Next

- ⏳ Test web version thoroughly
- ⏳ Deploy to Vercel
- ⏳ Get developer accounts (Apple & Google)
- ⏳ Test on iOS/Android simulators
- ⏳ Implement native OAuth
- ⏳ Submit to app stores

---

**Current Status:** Ready for web deployment! 🚀
