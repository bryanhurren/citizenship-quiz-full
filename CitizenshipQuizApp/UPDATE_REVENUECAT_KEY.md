# Update RevenueCat API Key

## Step-by-Step Instructions

### 1. Get Your API Key from RevenueCat

1. Go to [https://app.revenuecat.com](https://app.revenuecat.com)
2. Sign in to your account
3. Select your project: **Citizenship Quiz**
4. In the left sidebar, click **"API Keys"**
5. Under **"Public app-specific API keys"**, find your iOS app
6. Copy the key that starts with `appl_`
   - Example format: `appl_AbCdEfGhIjKlMnOpQrSt`

### 2. Update Your Code

**File to edit:** `src/services/purchases.ts`

**Find this code (around line 9-12):**
```typescript
const REVENUECAT_API_KEY = Platform.select({
  ios: 'YOUR_IOS_API_KEY',
  android: 'YOUR_ANDROID_API_KEY',
});
```

**Replace with:**
```typescript
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_YOUR_ACTUAL_KEY_HERE',  // Paste your copied key here
  android: 'YOUR_ANDROID_API_KEY',    // Leave as-is for now
});
```

### 3. Example

If your API key is `appl_AbCdEfGhIjKlMnOpQrSt`, your code should look like:

```typescript
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_AbCdEfGhIjKlMnOpQrSt',
  android: 'YOUR_ANDROID_API_KEY',
});
```

### 4. Save the File

After updating, save the file and rebuild your app.

### 5. Security Note

⚠️ **IMPORTANT**:
- This is a **public** API key, safe to include in your mobile app
- Do NOT use the **secret** API key in your mobile app
- The secret key should only be used on your server (if you have one)

## Verification

After updating and rebuilding your app:

1. Run the app in development mode
2. Check the console logs
3. Look for: `"RevenueCat initialized successfully"`
4. If you see an error, double-check:
   - Key is copied correctly (no extra spaces)
   - Key starts with `appl_`
   - You saved the file after editing

## Troubleshooting

**Error: "Invalid API key"**
- Key may be copied incorrectly
- Make sure there are no spaces before or after the key
- Verify it's the iOS key (starts with `appl_`), not Android key

**Error: "RevenueCat API key not configured"**
- The if statement on line 20 is triggering
- Make sure you replaced 'YOUR_IOS_API_KEY' with your actual key

**Nothing happens / No logs**
- Make sure you rebuilt the app after changing the code
- Check that you're testing on iOS (the code uses Platform.select)
