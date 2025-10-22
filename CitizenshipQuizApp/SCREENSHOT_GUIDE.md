# App Store Screenshot Capture Guide

## Requirements

**For App Store (2025):**
- **6.9-inch iPhone display** (iPhone 16 Pro Max)
- **Resolution**: 1320 x 2868 pixels (portrait)
- **Format**: PNG or JPEG
- **Quantity**: 3-10 screenshots
- **Max file size**: 10MB per screenshot

## Method 1: Using iPhone 16 Pro Max Simulator

### Step 1: Launch Simulator

```bash
# Boot the iPhone 16 Pro Max simulator
xcrun simctl boot A24ACC13-A4EA-4A48-BA43-E4B13C041096

# Open Simulator app
open -a Simulator
```

### Step 2: Build and Run App

```bash
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp
npx expo run:ios --device "iPhone 16 Pro Max"
```

### Step 3: Capture Screenshots

**To take a screenshot in Simulator:**
- Press `⌘ + S` (Command + S)
- Or: Device menu → Screenshot
- Screenshots save to your Desktop

### Screenshots to Capture

1. **Login Screen**
   - Shows: "AI Citizenship Quiz" title, app icon, Google/Apple sign-in buttons
   - Purpose: First impression of the app

2. **Mode Selection Screen**
   - Shows: Test version selection (2008/2025), Mode selection (Formal/Comedy)
   - Purpose: Demonstrate personalization options

3. **Quiz Screen - Question Display**
   - Shows: A citizenship question with the answer input field
   - Purpose: Core functionality

4. **Quiz Screen - AI Feedback**
   - Shows: AI-generated feedback after answering
   - Purpose: Highlight the AI-powered feature

5. **Results Screen**
   - Shows: Quiz completion with score breakdown
   - Purpose: Show progress tracking

6. **Profile/Stats Screen**
   - Shows: User statistics, session history
   - Purpose: Demonstrate tracking features

## Method 2: Using Physical iPhone

If you have iPhone 16 Pro Max, 15 Pro Max, or 15 Plus:

### Capture Screenshots:
1. Press **Volume Up + Side Button** simultaneously
2. Screenshots save to Photos app
3. AirDrop or email to your Mac

### Transfer to Mac:
```bash
# Screenshots will be in ~/Pictures or can be AirDropped
```

## Post-Capture: Verify Requirements

```bash
# Check screenshot dimensions
sips -g pixelWidth -g pixelHeight screenshot.png

# Should show:
# pixelWidth: 1320
# pixelHeight: 2868

# Resize if needed (from physical iPhone)
sips -Z 2868 screenshot.png --out screenshot-resized.png
```

## Screenshot Naming Convention

Recommended naming for organization:

```
01-login-screen.png
02-mode-selection.png
03-quiz-question.png
04-ai-feedback.png
05-results-screen.png
06-profile-stats.png
```

## Create Screenshots Folder

```bash
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp
mkdir -p app-store-screenshots
# Save all screenshots here
```

## Tips for Great Screenshots

### Do:
- ✅ Use real, compelling content (actual quiz questions)
- ✅ Show the app's personality (both Formal and Comedy modes are interesting)
- ✅ Highlight unique features (AI feedback, dual test versions)
- ✅ Keep UI clean (no keyboard overlays if possible)
- ✅ Use light mode (as configured in app)

### Don't:
- ❌ Show personal information
- ❌ Include notification badges
- ❌ Show loading states
- ❌ Include error messages
- ❌ Show empty states

## Automated Screenshot Capture (Alternative)

If you want to automate screenshots using Fastlane:

```bash
# Install Fastlane
gem install fastlane

# Create Fastfile with snapshot configuration
# (Advanced - requires additional setup)
```

## After Capturing

1. Review all screenshots for quality
2. Ensure dimensions are correct (1320x2868)
3. Organize in `app-store-screenshots/` folder
4. Upload to App Store Connect during submission

## Screenshot Descriptions (Optional but Recommended)

When uploading to App Store Connect, you can add descriptions:

1. **Login Screen**: "Sign in securely with Google or Apple"
2. **Mode Selection**: "Choose your test version and quiz mode"
3. **Quiz Question**: "Answer citizenship questions with confidence"
4. **AI Feedback**: "Get intelligent, personalized feedback"
5. **Results Screen**: "Track your progress and improvement"
6. **Profile/Stats**: "Review your quiz history and scores"

---

## Quick Start Commands

```bash
# 1. Create screenshots folder
mkdir -p /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp/app-store-screenshots

# 2. Launch simulator
xcrun simctl boot A24ACC13-A4EA-4A48-BA43-E4B13C041096
open -a Simulator

# 3. Build and run app
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp
npx expo run:ios --device "iPhone 16 Pro Max"

# 4. Take screenshots with ⌘+S in Simulator

# 5. Move screenshots from Desktop to project folder
mv ~/Desktop/Simulator*.png app-store-screenshots/

# 6. Verify dimensions
cd app-store-screenshots
sips -g pixelWidth -g pixelHeight *.png
```

## Need Help?

If screenshots are the wrong size, you can resize them:

```bash
# Resize maintaining aspect ratio
sips -Z 2868 input.png --out output.png
```

Good luck with your screenshots! 📸
