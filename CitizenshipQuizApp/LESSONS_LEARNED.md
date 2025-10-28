# AI Citizen Quiz App - Lessons Learned

## Executive Summary

This React Native/Expo app evolved from a web application to a cross-platform mobile app with payment integration and App Store submission. The journey highlighted several critical pain points in modern mobile development, particularly around Google Sign-In, RevenueCat integration, Metro bundler reliability, and App Store compliance.

---

## 1. Most Problematic Areas

### 🔴 Critical: Google Sign-In Integration (Expo SDK 54)

**Problem**: Google Sign-In with Expo SDK 54 was extremely fragile and underdocumented.

**Specific Issues**:
- **Incompatible library versions**: `@react-native-google-signin/google-signin` v13+ incompatible with Expo SDK 54
- **Required downgrade to v12.2.1** after multiple failed attempts
- **Undocumented breaking changes** between library versions
- **Config plugin issues**: `expo-build-properties` required manual configuration for iOS deployment target
- **Prebuild complications**: Constant need to clean and rebuild native projects

**Time Lost**: ~4-6 hours of troubleshooting across multiple sessions

**What We Should Have Done Differently**:
1. **Research library compatibility FIRST** before implementing any auth system
2. **Check Expo SDK compatibility table** at https://docs.expo.dev/versions/latest/
3. **Start with Apple Sign-In** (native Expo support, much simpler)
4. **Add Google Sign-In as secondary option** only if truly needed
5. **Test on physical device immediately** rather than relying on simulator

**Key Lesson**: Third-party auth integrations in Expo require extensive version compatibility research upfront.

---

### 🟠 High Impact: RevenueCat SDK Integration

**Problem**: RevenueCat initialization timing and singleton pattern caused race conditions.

**Specific Issues**:
- **"No singleton instance" errors** when users pressed upgrade button
- **Race condition**: UI rendered before RevenueCat finished initializing
- **Webhook integration complexity**: Stripe → RevenueCat → Supabase data flow
- **Sandbox testing confusion**: Apple Sandbox environment behaviors unclear
- **Multiple initialization calls**: Needed defensive programming to prevent re-initialization

**Time Lost**: ~3-4 hours debugging purchase flow

**What We Should Have Done Differently**:
1. **Initialize RevenueCat globally on app start** in App.tsx, not in component mount
2. **Add loading states** to prevent UI interaction before SDK ready
3. **Test sandbox purchases earlier** in development cycle
4. **Document webhook flow explicitly** with sequence diagrams
5. **Use RevenueCat's React hooks** (`useRevenueCat`) instead of manual singleton management

**Code Fix Required**:
```typescript
// ProfileScreen.tsx:384-394
const handleUpgradeConfirm = async () => {
  // Had to add explicit re-initialization to prevent race conditions
  await initializePurchases(currentUser.username);
  const offerings = await getOfferings();
  // ...
}
```

**Key Lesson**: Payment SDKs require careful initialization order and defensive error handling.

---

### 🟡 Medium Impact: Metro Bundler Reliability Issues

**Problem**: Metro bundler frequently entered bad states requiring full restarts.

**Specific Issues**:
- **"No script URL provided" errors** on physical device launches
- **Cached transform errors** persisting after code changes
- **Connection timeouts** between device and bundler
- **Multiple Metro instances** running simultaneously causing port conflicts
- **Fast Refresh failures** requiring full app reloads

**Time Lost**: ~2-3 hours across multiple sessions

**What We Should Have Done Differently**:
1. **Add Metro reset script to package.json**:
   ```json
   "scripts": {
     "reset": "watchman watch-del-all && rm -rf node_modules && npm install && npx expo start --clear"
   }
   ```
2. **Kill all Metro instances before starting**: `lsof -ti:8081 | xargs kill`
3. **Use environment-specific Metro configs** for development vs. production
4. **Monitor Metro logs actively** in separate terminal window
5. **Set up automated Metro health checks** before device builds

**Key Lesson**: Metro bundler is fragile; build defensive tooling and scripts for quick recovery.

---

### 🟡 Medium Impact: App Store Rejection & Compliance

**Problem**: Initial submission rejected for three compliance violations.

**Rejection Reasons**:
1. **No guest mode** - Forced login violated App Store guidelines
2. **Missing EULA** - Required legal document not provided
3. **No account deletion** - GDPR/privacy requirement not implemented

**Time Lost**: ~2-3 hours implementing fixes + full resubmission cycle

**What We Should Have Done Differently**:
1. **Read App Store Review Guidelines** (Section 5.1.1) BEFORE first submission
2. **Implement guest mode from day one** - it's now table stakes for App Store
3. **Use App Store guideline checklist** before building first archive
4. **Research similar app rejections** on forums/Reddit before submitting
5. **Test account deletion flow early** as part of user management

**Resources We Missed**:
- https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage
- https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple

**Key Lesson**: App Store compliance research must happen during planning phase, not after first rejection.

---

### 🟢 Low Impact but Frequent: AsyncStorage Persistence Edge Cases

**Problem**: Local state persistence caused confusing behaviors during testing.

**Specific Issues**:
- **`hasEverCreatedAccount` flag persisting** after account deletion
- **Guest mode not appearing** after deleting account (required full app reinstall)
- **Session data conflicts** between different user accounts
- **No clear way to reset local state** without reinstalling app

**What We Should Have Done Differently**:
1. **Add "Clear Local Data" debug option** in development builds
2. **Namespace AsyncStorage keys by user ID** to prevent conflicts:
   ```typescript
   const key = `quiz_session_${userId}`;
   ```
3. **Clear all AsyncStorage on logout/account deletion**:
   ```typescript
   await AsyncStorage.multiRemove(['hasEverCreatedAccount', 'guestSessionData']);
   ```
4. **Use react-native-mmkv** instead of AsyncStorage for better performance and reliability

**Key Lesson**: Local persistence requires careful cleanup logic, especially for user account transitions.

---

## 2. Integration Challenges

### Stripe → RevenueCat → Supabase Webhook Chain

**Challenge**: Three-service integration for payment processing.

**Flow**:
1. User purchases subscription via RevenueCat
2. Apple/Stripe processes payment
3. RevenueCat sends webhook to our API
4. API updates Supabase user record with expiration date
5. App polls Supabase for updated premium status

**Problems**:
- **Webhook delays**: 5-30 second lag between purchase and database update
- **Testing difficulty**: Sandbox environment behaves differently than production
- **Error handling**: No retry mechanism if webhook fails
- **No webhook logging**: Hard to debug failed webhook deliveries

**What We Should Have Done**:
1. **Add webhook request logging** in API endpoint
2. **Implement optimistic UI updates** - assume purchase succeeded, update UI immediately
3. **Add manual "Restore Purchases" button** in app for failed webhooks
4. **Set up RevenueCat webhook monitoring** with alerts
5. **Test webhook flow with ngrok** during development

---

### Claude API Rate Limiting (Web vs Mobile)

**Challenge**: AI answer evaluation shared quota between web and mobile apps.

**Impact**: Heavy web usage could exhaust API quota for mobile users.

**What We Should Have Done**:
1. **Separate API keys** for web vs. mobile environments
2. **Implement rate limiting per user** in API middleware
3. **Add caching layer** for common question/answer pairs
4. **Monitor API usage** with real-time dashboards
5. **Add fallback responses** when rate limit hit (e.g., "Please try again in a few minutes")

---

## 3. Development Workflow Issues

### Physical Device vs. Simulator Testing Gap

**Problem**: Simulators don't support in-app purchases, requiring constant physical device testing.

**Impact**: Slower iteration cycles, more friction in testing payment flows.

**What We Should Have Done**:
1. **Mock RevenueCat SDK** for simulator testing:
   ```typescript
   const isSimulator = Platform.OS === 'ios' && !Constants.isDevice;
   if (isSimulator) {
     // Use mock purchase flow
   }
   ```
2. **Create dedicated test builds** with mock payment flows
3. **Automate device deployment** with Fastlane scripts
4. **Use Expo Dev Client** for faster physical device iteration

---

### Screenshot Dimension Requirements

**Problem**: App Store Connect rejected initial screenshots (1320 × 2868px).

**Required**: 1284 × 2778px (iPhone 14/15 Pro Max standard)

**What We Should Have Done**:
1. **Check current year's screenshot requirements** BEFORE capturing
2. **Automate screenshot resizing** in build script:
   ```bash
   for file in screenshots/*.png; do
     sips -z 2778 1284 "$file" --out "$file"
   done
   ```
3. **Use Fastlane Snapshot** for automated screenshot generation
4. **Validate dimensions** before uploading to App Store Connect

---

## 4. Architecture Decisions - What Worked Well

### ✅ Zustand for State Management

**Why it worked**: Simple, performant, TypeScript-friendly.

**Benefits**:
- Minimal boilerplate compared to Redux
- Easy to integrate with AsyncStorage for persistence
- Great DevTools support
- No provider wrapper needed

**Would Use Again**: Absolutely

---

### ✅ Expo SDK 54 (Despite Google Sign-In Pain)

**Why it worked**: Managed workflow, OTA updates, cross-platform support.

**Benefits**:
- Faster development than bare React Native
- Built-in Apple Sign-In support
- Easy environment configuration
- EAS Build for production archives

**Would Use Again**: Yes, but would avoid complex third-party auth libraries

---

### ✅ Supabase for Backend

**Why it worked**: PostgreSQL with built-in auth, real-time, and REST API.

**Benefits**:
- No backend code needed
- Row-level security
- Real-time subscriptions (though we didn't use them)
- Easy webhook integrations

**Would Use Again**: Yes, excellent for MVP projects

---

## 5. What We'd Do Differently Next Time

### Planning Phase

1. **Create compliance checklist** from App Store guidelines BEFORE coding
2. **Research ALL third-party SDK compatibility** with target Expo SDK version
3. **Design guest mode into initial UX** - don't treat it as an afterthought
4. **Plan payment integration earlier** - it affects entire app architecture
5. **Budget 20% extra time** for third-party SDK integration debugging

### Development Phase

1. **Test on physical device from day one** - simulators hide too many issues
2. **Add comprehensive logging** for all external API calls (RevenueCat, Supabase, Claude)
3. **Build Metro reset scripts early** - you'll need them constantly
4. **Mock external services** for simulator testing
5. **Implement feature flags** to toggle incomplete features

### Testing Phase

1. **Create test account automation** - don't manually create/delete accounts
2. **Test payment flow in sandbox** before building production archive
3. **Validate App Store assets** (screenshots, descriptions) before submission
4. **Do full guest mode → signup → purchase → deletion flow** before submitting

### Submission Phase

1. **Read rejection patterns** for similar apps on forums
2. **Prepare "What's New" content** that addresses previous rejections
3. **Document reviewer test instructions** clearly
4. **Have TestFlight build ready** before App Store submission for beta testing

---

## 6. Technical Debt Incurred

### High Priority to Address

1. **RevenueCat initialization** - Still uses defensive re-initialization; should move to App.tsx
2. **AsyncStorage cleanup** - No clear user data reset mechanism
3. **Error handling** - Many try/catch blocks silently fail
4. **Webhook retry logic** - No retry if Stripe → RevenueCat → Supabase webhook fails
5. **API rate limiting** - Shared quota between web and mobile

### Medium Priority

1. **Metro bundler health monitoring** - No automated detection of bad states
2. **Screenshot automation** - Still manual capture and resizing
3. **Test coverage** - No automated tests for payment flow
4. **Logging infrastructure** - No centralized error tracking (Sentry, etc.)

---

## 7. Time Investment Breakdown

| Area | Estimated Time | Primary Challenges |
|------|---------------|-------------------|
| Google Sign-In debugging | 4-6 hours | Version compatibility, config plugins |
| RevenueCat integration | 3-4 hours | Singleton initialization, webhooks |
| Metro bundler issues | 2-3 hours | Cache states, connection errors |
| App Store compliance fixes | 2-3 hours | Guest mode, EULA, account deletion |
| Screenshot capture/resize | 1-2 hours | Dimension requirements |
| AsyncStorage edge cases | 1-2 hours | Persistence cleanup |
| **Total "Pain Points"** | **13-20 hours** | ~30-40% of total dev time |

---

## 8. Key Takeaways

### For Future Mobile Projects

1. **Third-party auth is expensive** - Budget 2x the time you think it will take
2. **Payment integration is complex** - Plan for webhook debugging and edge cases
3. **App Store compliance is not optional** - Research guidelines during planning phase
4. **Physical device testing is mandatory** - Simulators hide critical issues
5. **Metro bundler will fail you** - Build defensive tooling and scripts

### For AI-Assisted Development

1. **Version compatibility checking** - AI should always verify library versions before suggesting implementations
2. **Platform-specific gotchas** - AI needs deeper knowledge of Expo SDK compatibility matrices
3. **Debugging strategies** - AI should suggest systematic debugging (logs, network traces) earlier
4. **Best practices research** - AI should proactively search for "known issues with X in 2025" before implementing

---

## 9. Success Metrics

Despite the challenges, we achieved:

- ✅ Full OAuth authentication (Google + Apple)
- ✅ In-app purchase integration with RevenueCat
- ✅ Guest mode with 5-question trial
- ✅ Account deletion and EULA compliance
- ✅ Premium subscription with webhook integration
- ✅ App Store submission completed
- ✅ Cross-platform support (iOS + Web)

**Total Development Time**: ~40-50 hours (including debugging)

**Learnings Applied**: This document will save 10-15 hours on the next similar project.

---

## 10. Recommended Resources for Future Projects

### Before Starting

- [ ] Expo SDK compatibility table: https://docs.expo.dev/versions/latest/
- [ ] App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- [ ] RevenueCat documentation: https://www.revenuecat.com/docs/
- [ ] Google Sign-In + Expo issues: GitHub Issues search

### During Development

- [ ] Metro bundler troubleshooting guide
- [ ] Physical device deployment automation (Fastlane)
- [ ] RevenueCat webhook testing with ngrok
- [ ] Screenshot automation tools (Fastlane Snapshot)

### Before Submission

- [ ] App Store rejection patterns for similar apps
- [ ] TestFlight beta testing for real user feedback
- [ ] Accessibility compliance checklist
- [ ] Privacy policy and EULA templates

---

## 11. Specific Code Issues and Solutions

### Issue: RevenueCat Singleton Initialization

**File**: `src/screens/ProfileScreen.tsx:384-394`

**Problem**: Race condition where upgrade button could be pressed before RevenueCat initialization completed.

**Solution Applied**:
```typescript
const handleUpgradeConfirm = async () => {
  if (!currentUser) return;

  setIsLoading(true);

  try {
    // Ensure RevenueCat is initialized before getting offerings
    await initializePurchases(currentUser.username);

    // Get available offerings
    const offerings = await getOfferings();
    // ... rest of purchase flow
  }
}
```

**Better Solution for Next Time**:
```typescript
// In App.tsx
useEffect(() => {
  if (currentUser) {
    initializePurchases(currentUser.username);
  }
}, [currentUser]);

// In ProfileScreen.tsx
const handleUpgradeConfirm = async () => {
  // RevenueCat already initialized globally
  const offerings = await getOfferings();
  // ...
}
```

---

### Issue: Google Sign-In Library Compatibility

**File**: `package.json`

**Problem**: `@react-native-google-signin/google-signin@13.x` incompatible with Expo SDK 54

**Solution Applied**:
```json
{
  "dependencies": {
    "@react-native-google-signin/google-signin": "12.2.1"
  }
}
```

**Research Process**:
1. Initial error: "Cannot read property 'SIGN_IN_CANCELLED' of null"
2. Web search revealed Expo SDK 54 incompatibility with v13+
3. Downgraded to v12.2.1 (last compatible version)
4. Added `expo-build-properties` plugin to set iOS deployment target to 13.4

**Lesson**: Always check `expo upgrade` output and compatibility tables before upgrading dependencies.

---

### Issue: Metro Bundler "No Script URL Provided"

**Occurred**: Multiple times during physical device testing

**Root Causes**:
1. Metro bundler not fully started before device connection
2. Multiple Metro instances on port 8081
3. Stale cache states
4. Network configuration changes

**Solutions Applied**:
```bash
# Kill all Metro instances
lsof -ti:8081 | xargs kill

# Clear all caches
npx expo start --clear

# Reset project completely
watchman watch-del-all && rm -rf node_modules && npm install
```

**Prevention Script** (should have created this earlier):
```json
// package.json
{
  "scripts": {
    "dev:reset": "lsof -ti:8081 | xargs kill; npx expo start --clear",
    "dev:full-reset": "lsof -ti:8081 | xargs kill; watchman watch-del-all && rm -rf node_modules && npm install && npx expo start --clear"
  }
}
```

---

### Issue: AsyncStorage Persistence After Account Deletion

**File**: `src/screens/ProfileScreen.tsx` (account deletion flow)

**Problem**: `hasEverCreatedAccount` flag persisted after account deletion, preventing guest mode from showing.

**Current Workaround**: Full app reinstall

**Proper Solution** (should implement):
```typescript
const handleDeleteAccount = async () => {
  try {
    // Delete from Supabase
    await deleteUserAccount(currentUser.id);

    // Clear ALL AsyncStorage data
    await AsyncStorage.multiRemove([
      'hasEverCreatedAccount',
      'currentUser',
      'quizState',
      'guestSessionData'
    ]);

    // Reset Zustand store
    useQuizStore.getState().reset();

    // Navigate to welcome screen
    navigation.navigate('Welcome');
  } catch (error) {
    console.error('Account deletion failed:', error);
  }
};
```

---

### Issue: Screenshot Dimensions

**Problem**: iPhone 16 Pro Max simulator creates 1320 × 2868px screenshots, but App Store Connect requires 1284 × 2778px.

**Solution Applied**:
```bash
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp/screenshots
for file in *.png; do
  sips -z 2778 1284 "$file" --out "$file"
done
```

**Should Have Automated** in build script:
```json
// package.json
{
  "scripts": {
    "screenshots:resize": "cd screenshots && for file in *.png; do sips -z 2778 1284 \"$file\" --out \"$file\"; done"
  }
}
```

---

## 12. App Store Submission Checklist

Based on our rejection experience, here's a comprehensive checklist for future submissions:

### Pre-Development

- [ ] Review App Store Review Guidelines (Sections 2.1, 3.1, 5.1)
- [ ] Plan guest mode / free tier from the start
- [ ] Prepare EULA and Privacy Policy templates
- [ ] Research competitor app rejections on forums

### During Development

- [ ] Implement guest mode with meaningful functionality
- [ ] Add account deletion feature in user settings
- [ ] Create EULA and host it publicly
- [ ] Test on physical device weekly (not just simulator)
- [ ] Document all third-party SDKs and their versions

### Pre-Submission Testing

- [ ] Complete end-to-end flow: guest → signup → premium → deletion
- [ ] Test on multiple iOS versions
- [ ] Validate all external links work (privacy policy, EULA, support)
- [ ] Create test account with credentials for reviewers
- [ ] Capture and resize screenshots to exact specifications

### App Store Connect Setup

- [ ] Set correct age rating (17+ for mature content)
- [ ] Fill in all required metadata fields
- [ ] Add clear "What's New" section addressing previous rejections
- [ ] Provide detailed reviewer notes explaining:
  - Guest mode functionality
  - How to test premium features
  - Any mature content warnings
  - Test account credentials

### Post-Submission

- [ ] Monitor App Store Connect for status changes
- [ ] Prepare rapid response to rejection feedback
- [ ] Have TestFlight build ready for beta testers
- [ ] Plan marketing materials for launch

---

## 13. Future Improvements Roadmap

### Phase 1: Technical Debt (1-2 weeks)

1. Move RevenueCat initialization to App.tsx
2. Implement proper AsyncStorage cleanup on logout/deletion
3. Add comprehensive error logging (integrate Sentry)
4. Create Metro reset scripts
5. Add webhook retry logic with exponential backoff

### Phase 2: Testing Infrastructure (1 week)

1. Add Jest/Testing Library for component tests
2. Mock RevenueCat for simulator testing
3. Create automated screenshot generation pipeline
4. Add E2E tests with Detox
5. Implement feature flags for incomplete features

### Phase 3: User Experience (2 weeks)

1. Add "Restore Purchases" button
2. Implement optimistic UI updates for purchases
3. Add loading skeletons for async operations
4. Improve error messages with actionable guidance
5. Add offline support for quiz sessions

### Phase 4: Performance & Monitoring (1 week)

1. Integrate analytics (Mixpanel or Amplitude)
2. Add performance monitoring
3. Implement API response caching
4. Optimize bundle size
5. Add crash reporting

---

## 14. Resources That Would Have Saved Time

### Documentation We Should Have Read First

1. **Expo SDK 54 Release Notes**: https://expo.dev/changelog/2024/11-12-sdk-54
   - Would have revealed Google Sign-In compatibility issues

2. **App Store Review Guidelines 5.1.1**: https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage
   - Explicitly states guest mode requirement

3. **RevenueCat iOS Integration Guide**: https://www.revenuecat.com/docs/getting-started/installation/ios
   - Covers initialization best practices we missed

4. **React Native Performance Best Practices**: https://reactnative.dev/docs/performance
   - Would have prevented some Metro bundler issues

### Community Resources

1. **Expo Discord**: Real-time help for SDK compatibility issues
2. **r/reactnative**: Common pitfalls and solutions
3. **GitHub Issues**: Specific library version incompatibilities
4. **Stack Overflow**: Metro bundler troubleshooting

---

## 15. Cost Analysis

### Direct Costs

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer Program | $99/year | Required for App Store |
| RevenueCat Starter Plan | $0/month | Free tier sufficient for MVP |
| Supabase Free Tier | $0/month | Adequate for current usage |
| Claude API | ~$20/month | Based on usage |
| Vercel Hosting | $0/month | Free tier for web version |
| **Total Monthly** | **~$20** | Plus $99 annual Apple fee |

### Time Costs (at $100/hour consulting rate)

| Activity | Hours | Value |
|----------|-------|-------|
| Core development | 25-30 | $2,500-$3,000 |
| Debugging/troubleshooting | 13-20 | $1,300-$2,000 |
| App Store submission | 3-4 | $300-$400 |
| **Total Project Value** | **41-54 hours** | **$4,100-$5,400** |

### ROI of Lessons Learned

Estimated time savings on next similar project: **10-15 hours** ($1,000-$1,500 value)

Areas where we'll save time:
- Google Sign-In: 3-4 hours (know exact version to use)
- RevenueCat: 2-3 hours (initialize correctly from start)
- Metro bundler: 2 hours (have reset scripts ready)
- App Store compliance: 3-4 hours (guest mode from day one)

---

## 16. Final Recommendations

### For Individual Developers

1. **Start with Apple Sign-In only** - Add Google later if truly needed
2. **Use Expo managed workflow** - Don't eject to bare React Native unless absolutely necessary
3. **Test on physical device weekly** - Simulators hide too many issues
4. **Read App Store guidelines** before writing any code
5. **Budget 40% extra time** for third-party integrations

### For Teams

1. **Assign one person to platform compliance research** (App Store, Google Play)
2. **Create integration testing checklist** for payment flows
3. **Set up CI/CD early** with automated screenshot generation
4. **Use feature flags** to ship incomplete features to TestFlight
5. **Document all third-party SDK versions** and compatibility matrices

### For AI-Assisted Development

1. **Always verify library versions** before implementing
2. **Search for "known issues [library] [current year]"** proactively
3. **Suggest systematic debugging** (logs, network traces) earlier in process
4. **Reference official documentation** over blog posts when possible
5. **Question outdated patterns** - mobile dev moves fast

---

**Document Version**: 1.0
**Created**: 2025-10-23
**App Version**: 1.0.3
**Status**: Submitted to App Store, awaiting review
**Author**: AI Citizen Quiz Development Team

---

## Appendix: Quick Reference Commands

### Development

```bash
# Start development server
npm start

# Reset Metro bundler
lsof -ti:8081 | xargs kill && npx expo start --clear

# Full project reset
watchman watch-del-all && rm -rf node_modules && npm install && npx expo start --clear

# Run on physical iOS device
npx expo run:ios --device
```

### Build & Deploy

```bash
# Create production build (Xcode)
open ios/AICitizenQuiz.xcworkspace
# Then: Product > Archive

# Resize screenshots
cd screenshots
for file in *.png; do sips -z 2778 1284 "$file" --out "$file"; done
```

### Debugging

```bash
# Check Metro port
lsof -ti:8081

# View device logs
npx react-native log-ios

# Clear AsyncStorage (add to app)
# Settings > Developer > Clear Local Data
```

### Testing

```bash
# Run type checking
npm run typecheck

# Test build before submission
npx expo run:ios --configuration Release
```

---

End of document.
