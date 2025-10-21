# App Store Submission Guide for AI Citizen Quiz

## Overview

This guide walks you through submitting your iOS app to the Apple App Store. The process has been updated for 2025 requirements.

## ✅ Completed Automated Tasks

- [x] Added build number to app.json (iOS configuration)
- [x] Verified app.json configuration
- [x] Created Privacy Policy document (PRIVACY_POLICY.md)
- [x] Updated CLAUDE.md with Repeated Request Protocol

## 📋 Prerequisites

### 1. Apple Developer Account (**Required** - Manual Step)

- **Cost**: $99/year
- **Sign up**: https://developer.apple.com
- **What you need**:
  - Apple ID
  - Payment method
  - 2-Factor Authentication enabled

### 2. Privacy Policy URL (**Required** - Manual Step)

You need to host the PRIVACY_POLICY.md file at a publicly accessible URL. Options:

- **GitHub Pages**: Free, simple
- **Your own website**: Full control
- **Third-party service**: Like Termly or Privacy Policy Generator

**Action Required**:
1. Host PRIVACY_POLICY.md online
2. Update the contact email in PRIVACY_POLICY.md to your actual email
3. Save the URL for App Store Connect

## 📱 App Screenshots (Required)

### Requirements (Updated Sept 2024):

Apple now requires **6.9-inch iPhone screenshots** (iPhone 16 Pro Max):

- **Dimensions**: 1320 x 2868 pixels or 2868 x 1320 pixels (portrait recommended)
- **Format**: JPEG or PNG
- **Resolution**: 72 PPI
- **Max file size**: 10MB per screenshot
- **Quantity**: 3-10 screenshots recommended

### How to Capture Screenshots:

#### Option 1: Using iOS Simulator (Recommended)

```bash
# Start simulator with 6.9" display (iPhone 16 Pro Max)
open -a Simulator

# In Simulator menu: File > Open Simulator > iPhone 16 Pro Max

# Build and run your app on this simulator
npx expo run:ios

# Take screenshots:
# - Press Cmd+S in simulator to save screenshot to Desktop
# - Or: Device > Screenshot (saves to Desktop)
```

#### Option 2: Using Your Physical iPhone

If you have an iPhone 16 Pro Max or iPhone 15 Pro Max (6.7"):
1. Run app on device
2. Press Volume Up + Side Button simultaneously
3. Screenshots save to Photos app
4. AirDrop or email to your Mac

### Recommended Screenshots to Capture:

1. **Login Screen** - Showing Google/Apple sign-in
2. **Mode Selection Screen** - Showing test version and quiz mode options
3. **Quiz In Progress** - Showing a question and answer interface
4. **AI Feedback** - Showing the AI-generated feedback (formal or comedy mode)
5. **Results Screen** - Showing quiz completion and score
6. **Profile/Stats Screen** - Showing user progress and statistics

## 🏗️ Build Production Archive

### Option 1: Using Xcode (Traditional Method)

1. **Open project in Xcode**:
```bash
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp
open ios/CitizenshipQuizApp.xcworkspace
```

2. **Select "Any iOS Device" as target** (top toolbar)

3. **Archive the app**:
   - Menu: Product > Archive
   - Wait for archive to complete (5-15 minutes)

4. **Upload to App Store Connect**:
   - Archives window opens automatically
   - Click "Distribute App"
   - Select "App Store Connect"
   - Follow prompts to upload

### Option 2: Using EAS Build (Expo Alternative)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure for iOS
eas build:configure

# Create production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

## 🌐 App Store Connect Setup

### Step 1: Create App Record

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" > "+" > "New App"
3. Fill in details:
   - **Platform**: iOS
   - **Name**: AI Citizen Quiz
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.bryanhurren.citizenshipquiz (should be auto-detected)
   - **SKU**: AICQ001 (or your preferred unique identifier)

### Step 2: App Information

**Category**:
- **Primary**: Education
- **Secondary**: Reference

**Age Rating**: 17+ (due to comedy mode with profanity)

**Content Rights**: You retain all ownership rights

### Step 3: Pricing and Availability

- **Price**: Free (or set your price)
- **Availability**: All territories (or select specific countries)

### Step 4: App Privacy

Click "Edit" under "App Privacy":

1. **Data Collection**: Yes, we collect data

2. **Data Types** (based on your app):
   - **Contact Info**: Email address (for authentication)
   - **Identifiers**: User ID (for account management)
   - **Usage Data**: Quiz progress, scores, session data

3. **Purpose**:
   - App Functionality
   - Analytics
   - Product Personalization

4. **Privacy Policy URL**: Enter the URL where you hosted PRIVACY_POLICY.md

### Step 5: App Store Listing

**App Name**: AI Citizen Quiz

**Subtitle** (30 characters max): US Citizenship Test Prep

**Description** (4000 characters max):
```
Master the US Citizenship civics test with AI-powered feedback! AI Citizen Quiz helps you prepare for your naturalization interview with an interactive, intelligent study experience.

KEY FEATURES:

📚 Dual Test Support
• 2008 Test: 100 questions for those who filed Form N-400 before Oct 20, 2025
• 2025 Test: 128 questions for those who filed on/after Oct 20, 2025

🤖 AI-Powered Feedback
• Get intelligent, context-aware feedback on every answer
• Learn from partial credit responses
• Understand why answers are correct or incorrect

🎭 Two Quiz Modes
• Formal Mode: Professional USCIS interview simulation with educational feedback
• Comedy Mode (18+): Entertaining study experience with personality

📊 Progress Tracking
• Save your progress automatically
• Resume sessions anytime, anywhere
• Track correct, partial, and incorrect answers
• Monitor your improvement over time
• View your best scores

✨ Smart Features
• Questions randomized for better learning
• Retry options based on your selected mode
• Works offline after initial setup
• Clean, intuitive interface
• Supports iPhone and iPad

🔐 Secure & Private
• Sign in with Google or Apple
• Your data is encrypted and secure
• No ads, no tracking

Whether you're preparing for your citizenship test or helping someone else study, AI Citizen Quiz makes test preparation engaging and effective.

Download now and start your journey to US citizenship!

Age Rating: 17+ (Comedy mode contains mature humor and profanity)
```

**Keywords** (100 characters max, comma-separated):
```
citizenship,test,quiz,uscis,naturalization,civics,immigration,study,exam,preparation
```

**Promotional Text** (170 characters max):
```
Prepare for your US Citizenship test with AI-powered feedback. Choose between formal USCIS simulation or entertaining comedy mode. Track your progress!
```

**Support URL**: Your website or GitHub repository URL

**Marketing URL** (optional): Your marketing page

**What's New in This Version** (4000 characters max):
```
Initial release of AI Citizen Quiz!

• Complete 2008 and 2025 test question sets
• AI-powered answer evaluation
• Dual mode system: Formal and Comedy
• Progress tracking and session management
• Sign in with Google or Apple
• Offline support
```

### Step 6: Build

1. Wait for your archive upload to process (can take 15-60 minutes)
2. Once processed, select the build under "Build" section
3. Click the (+) next to the build version to add it

### Step 7: Screenshots and App Preview

Upload your 6.9" iPhone screenshots here (3-10 screenshots)

**Screenshot Descriptions** (Optional but recommended):
1. "Sign in securely with Google or Apple"
2. "Choose your test version and quiz mode"
3. "Answer questions with intelligent guidance"
4. "Get AI-powered feedback on your answers"
5. "Track your progress and scores"
6. "Review your session statistics"

### Step 8: App Review Information

**Contact Information**:
- **First Name**: Your first name
- **Last Name**: Your last name
- **Phone Number**: Your phone number
- **Email**: Your email address

**Demo Account** (if required):
Since your app requires sign-in, provide:
- **Username**: A test account email
- **Password**: A test account password
- **Notes**: "Test account for review purposes. Sign in with Google or Apple also available."

**Notes for Reviewer**:
```
This app helps users prepare for the US Citizenship civics test.

IMPORTANT: The app has two modes:
1. Formal Mode - Professional USCIS interview simulation
2. Comedy Mode (17+) - Contains dark humor and profanity (like Anthony Jeselnik comedy style)

The comedy mode is clearly labeled with age warnings and requires explicit user selection.

Test Account Credentials:
Email: [provide test email]
Password: [provide test password]

To test:
1. Sign in with provided credentials
2. Select test version (2008 or 2025)
3. Choose quiz mode (Formal or Comedy)
4. Answer questions to see AI feedback
5. Review progress tracking features
```

### Step 9: Content Rights and Age Rating

**Age Rating Questionnaire**:
- **Unrestricted Web Access**: No
- **Profanity or Crude Humor**: Yes (Infrequent/Mild for Formal, Frequent/Intense for Comedy)
- **Sexual Content**: No
- **Violence**: No
- **Mature/Suggestive Themes**: No

**Result**: 17+ (due to comedy mode)

### Step 10: Version Release

**Release Option**:
- **Manual Release**: You control when the app goes live
- **Automatic Release**: App releases immediately after approval
- **Scheduled Release**: Choose a specific date

## 🚀 Submit for Review

1. **Review all sections** - Make sure everything is complete
2. **Click "Add for Review"** - Top right corner
3. **Click "Submit to App Review"**
4. **Wait for review** - Typically 1-3 days

## 📊 Review Process

### What to Expect:

1. **In Review**: Apple is reviewing your app (1-48 hours typically)
2. **Pending Developer Release**: Approved! Waiting for you to release
3. **Ready for Sale**: Live on the App Store!

### Common Rejection Reasons to Avoid:

- **Missing privacy policy** - ✅ You have this
- **Broken features** - Test thoroughly before submitting
- **Misleading description** - Be accurate in your listing
- **Age rating issues** - You've correctly set 17+
- **Login issues** - Make sure test account works

## 🔄 After Approval

### To Release Your App:

If you selected "Manual Release":
1. Go to App Store Connect
2. Click your app
3. Click "Release This Version"

### Monitor Your App:

- Check crash reports in App Store Connect
- Monitor user reviews
- Track downloads and engagement

## 📝 Future Updates

When you need to submit an update:

1. Increment version in app.json: `"version": "1.1.0"`
2. Increment buildNumber: `"buildNumber": "2"`
3. Create new archive
4. Upload to App Store Connect
5. Update "What's New" section
6. Submit for review

## 🆘 Troubleshooting

### Build Upload Issues:

- Make sure you're logged into the correct Apple ID in Xcode
- Verify your bundle identifier matches App Store Connect
- Check that your certificates and profiles are up to date

### App Review Rejection:

- Read the rejection reason carefully
- Make necessary changes
- Respond to reviewer in Resolution Center
- Resubmit

## 📞 Support Resources

- **App Store Connect Help**: https://developer.apple.com/support/app-store-connect/
- **Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Expo Documentation**: https://docs.expo.dev/submit/ios/
- **Apple Developer Forums**: https://developer.apple.com/forums/

---

## Summary Checklist

Before submitting, verify:

- [ ] Apple Developer account enrolled ($99/year)
- [ ] Privacy Policy hosted at public URL
- [ ] 6-10 screenshots captured (6.9" iPhone)
- [ ] Production build created and uploaded
- [ ] App Store Connect listing complete
- [ ] Test account credentials provided
- [ ] Age rating set to 17+
- [ ] All contact information accurate
- [ ] App tested thoroughly on device

Good luck with your submission! 🎉
