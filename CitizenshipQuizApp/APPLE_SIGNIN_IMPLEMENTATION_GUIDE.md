# Apple Sign-In Implementation Guide

## Overview

This document provides implementation instructions for completing the Apple Sign-In authentication flow using Apple's stable user identifiers instead of email-only authentication.

## What's Been Completed

### 1. Database Schema ✅
- Added `apple_user_id TEXT` column to `users` table
- Created index `idx_users_apple_user_id` for fast lookups
- Column is nullable to support existing users

### 2. TypeScript Types ✅
- Added `apple_user_id?: string | null` to User interface (`src/types/index.ts:56`)

### 3. Supabase Service Function ✅
- Added `getUserByAppleId(appleUserId: string)` function (`src/services/supabase.ts:32-50`)
- Looks up users by their stable Apple user identifier

## What Needs to Be Done

### Update LoginScreen.tsx

Update the `handleAppleSignIn` function (lines 86-164) to:

1. **Store the Apple user ID on first sign-in:**
   ```typescript
   const appleUserId = credential.user; // This is the stable identifier
   ```

2. **Try looking up by Apple user ID first:**
   ```typescript
   // Import at top: getUserByAppleId
   let existingUser = await getUserByAppleId(appleUserId);

   // Fallback to email lookup for backwards compatibility
   if (!existingUser && email) {
     existingUser = await getUser(email);

     // If found by email, update with apple_user_id
     if (existingUser) {
       await updateUser(existingUser.username, { apple_user_id: appleUserId });
     }
   }
   ```

3. **Store apple_user_id when creating new users:**
   ```typescript
   const newUser = await createUser({
     username: email,
     apple_user_id: appleUserId, // ADD THIS LINE
     // ... rest of user object
   });
   ```

### Update ProfileScreen.tsx

Apply the same changes to `handleAppleSignIn` function (lines 152-209):

1. Import `getUserByAppleId` from supabase service
2. Extract `appleUserId` from `credential.user`
3. Try lookup by Apple ID first, then fallback to email
4. Update existing users with their apple_user_id if found by email
5. Store apple_user_id when creating new users

## Implementation Code

### LoginScreen.tsx Changes

```typescript
import {
  getUser,
  getUserByAppleId, // ADD THIS IMPORT
  createUser,
  updateUser as updateUserInDb,
  // ... other imports
} from '../services/supabase';

const handleAppleSignIn = async () => {
  setError('');
  setIsLoading(true);

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Extract stable Apple user identifier
    const appleUserId = credential.user;

    // Extract email (only provided on first sign-in)
    const email = credential.email || `${appleUserId}@privaterelay.appleid.com`;
    const name = credential.fullName?.givenName || 'User';

    // Try to find user by Apple user ID first (best practice)
    let existingUser = await getUserByAppleId(appleUserId);

    // Fallback: Look up by email for backwards compatibility with existing users
    if (!existingUser && email) {
      existingUser = await getUser(email);

      // If found by email, update their record with apple_user_id
      if (existingUser) {
        const updated = await updateUserInDb(existingUser.username, {
          apple_user_id: appleUserId
        });
        if (updated) existingUser = updated;
      }
    }

    if (existingUser) {
      // Existing user - log them in
      await storeLoggedInUser(email);
      setCurrentUser(existingUser);
      setIsNewUser(false);
      setShowWelcomeModal(true);
    } else {
      // New user - create account
      const newUser = await createUser({
        username: email,
        password: '',
        apple_user_id: appleUserId, // Store Apple user ID
        invite_code: 'OAUTH-AUTO',
        current_question: 0,
        correct_count: 0,
        partial_count: 0,
        incorrect_count: 0,
        question_results: [],
        completed: false,
        best_score: 0,
        last_session_date: null,
        notification_enabled: true,
        notification_time: '09:00',
        profile_picture: null,
      });

      if (newUser) {
        await storeLoggedInUser(email);
        await setHasCreatedAccount();
        await AsyncStorage.setItem('isNewUser', 'true');
        setCurrentUser(newUser);
        await requestNotificationPermissionsForNewUser(newUser.id);
        setIsNewUser(true);
        setShowWelcomeModal(true);
      } else {
        setError('Error creating account');
      }
    }
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      setError('Sign in canceled');
    } else {
      setError('Error signing in with Apple. Please try again.');
    }
  } finally {
    setIsLoading(false);
  }
};
```

### ProfileScreen.tsx Changes

Apply the exact same logic pattern to the `handleAppleSignIn` function in ProfileScreen.tsx.

## Benefits of This Implementation

1. **Reliable subsequent logins**: Users can log in multiple times without issues
2. **Email choice flexibility**: Works whether user chose "Hide My Email" or "Share My Email"
3. **Backwards compatible**: Existing users who signed in before this change will continue to work
4. **Apple best practices**: Uses stable user identifier as primary authentication key

## Testing

### Test Case 1: New User Sign-In
1. Sign in with Apple for the first time
2. Choose either "Hide My Email" or "Share My Email"
3. Verify account is created with `apple_user_id` populated

### Test Case 2: Subsequent Sign-In
1. Sign out
2. Sign in with Apple again
3. Verify login succeeds (Apple won't ask about email again)
4. Verify user is correctly identified by their `apple_user_id`

### Test Case 3: Existing User Migration
1. For users who signed in before this change (no `apple_user_id`)
2. On next sign-in, their record should be updated with `apple_user_id`
3. Future sign-ins should use the Apple user ID

## Files Modified

- `src/types/index.ts` - Added `apple_user_id` field to User interface
- `src/services/supabase.ts` - Added `getUserByAppleId()` function
- `add-apple-user-id-migration.sql` - Database migration script
- Database: `users` table now has `apple_user_id` column

## Files To Modify

- `src/screens/LoginScreen.tsx` - Update `handleAppleSignIn` function
- `src/screens/ProfileScreen.tsx` - Update `handleAppleSignIn` function
