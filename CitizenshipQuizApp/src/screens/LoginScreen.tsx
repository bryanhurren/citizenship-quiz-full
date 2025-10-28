import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, GoogleSignInButton, WelcomeModal } from '../components';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { useQuizStore, storeLoggedInUser } from '../store/quizStore';
import {
  getUser,
  getUserByAppleId,
  createUser,
  validateInviteCode,
  markInviteCodeAsUsed,
  updateUser as updateUserInDb,
} from '../services/supabase';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync, scheduleDailyReminder } from '../services/notifications';
import { setHasCreatedAccount } from '../services/guestMode';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);

  // OAuth state
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteCodePrompt, setShowInviteCodePrompt] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [pendingOAuthUser, setPendingOAuthUser] = useState<{
    email: string;
    name: string;
    provider: 'apple' | 'google';
  } | null>(null);

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Error state
  const [error, setError] = useState('');

  // No initial navigation needed - AppNavigator handles routing

  // Helper function to request notification permissions after account creation
  const requestNotificationPermissionsForNewUser = async (userId: number) => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        // Permission granted - schedule daily reminder at 9 AM
        await scheduleDailyReminder('09:00');
        console.log('✅ Notification permissions granted for new user');
      } else {
        console.log('⚠️ Notification permissions denied by user');
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  // Handle welcome modal dismiss
  const handleWelcomeModalDismiss = () => {
    setShowWelcomeModal(false);

    if (isNewUser) {
      // New user - navigate to Mode Selection
      navigation.navigate('Main' as never, {
        screen: 'Session',
        params: { screen: 'ModeSelection' },
      } as never);
    } else {
      // Existing user - navigate to You tab
      navigation.navigate('Main' as never);
    }
  };

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

      console.log('Apple Sign-In - Apple User ID:', appleUserId);
      console.log('Apple Sign-In - Email:', email);
      console.log('Apple Sign-In - Email provided by Apple:', !!credential.email);

      // Try to find user by Apple user ID first (best practice)
      let existingUser = await getUserByAppleId(appleUserId);
      console.log('Found by Apple ID:', !!existingUser);

      // Fallback: Look up by email for backwards compatibility with existing users
      if (!existingUser && email) {
        existingUser = await getUser(email);
        console.log('Found by email:', !!existingUser);

        // If found by email, update their record with apple_user_id
        if (existingUser) {
          console.log('Updating existing user with Apple ID...');
          const updated = await updateUserInDb(existingUser.username, {
            apple_user_id: appleUserId
          });
          if (updated) {
            console.log('Successfully updated user with Apple ID');
            existingUser = updated;
          } else {
            console.error('Failed to update user with Apple ID');
          }
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

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      console.log('Google Sign-In Response:', JSON.stringify(response, null, 2));

      // Handle different response structures
      const data = response.data || response;
      const user = data.user || data;

      const email = user?.email || data?.email;
      const name = user?.givenName || user?.name || data?.givenName || data?.name || 'User';
      const photo = user?.photo || data?.photo || null;

      console.log('Google profile photo URL:', photo);

      if (!email) {
        throw new Error('No email received from Google Sign-In');
      }

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // Existing user - log them in
        // Update profile picture if it's new or different
        if (photo && existingUser.profile_picture !== photo) {
          await updateUserInDb(existingUser.username, { profile_picture: photo });
          existingUser.profile_picture = photo;
        }
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
        // Show welcome back modal
        setIsNewUser(false);
        setShowWelcomeModal(true);
      } else {
        // New user - auto-create account and go to Mode Selection
        const newUser = await createUser({
          username: email,
          password: '', // No password for OAuth users
          invite_code: 'OAUTH-AUTO', // Auto-created OAuth users
          current_question: 0,
          correct_count: 0,
          partial_count: 0,
          incorrect_count: 0,
          question_results: [],
          completed: false,
          best_score: 0,
          last_session_date: null,
          notification_enabled: true, // Default to ON for new users
          notification_time: '09:00', // Default to 9 AM
          profile_picture: photo, // Store Google profile picture
        });

        if (newUser) {
          // Auto-login
          await storeLoggedInUser(email);

          // Mark that user has created an account (persistent flag)
          await setHasCreatedAccount();

          // Store flag that this is a new user for Mode Selection screen
          await AsyncStorage.setItem('isNewUser', 'true');

          setCurrentUser(newUser);

          // Request notification permissions for new users
          await requestNotificationPermissionsForNewUser(newUser.id);

          // Show welcome modal for new user
          setIsNewUser(true);
          setShowWelcomeModal(true);
        } else {
          setError('Error creating account');
        }
      }
    } catch (error: any) {
      console.log('Google Sign-In Error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);

      // Show more specific error
      if (error.code === '-5' || error.code === 'SIGN_IN_CANCELLED') {
        setError('Sign-in cancelled');
      } else {
        setError(`Error: ${error.message || 'Please try again'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteCodeSubmit = async () => {
    /* INVITE CODE DISABLED - Auto-create accounts without invite codes
    if (!inviteCode || !pendingOAuthUser) {
      setError('Please enter an invite code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate invite code
      const isValid = await validateInviteCode(inviteCode);
      if (!isValid) {
        setError('Invalid or already used invite code');
        setIsLoading(false);
        return;
      }
    */

    if (!pendingOAuthUser) {
      setError('Account creation error');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create new user with OAuth data (invite code disabled)
      const newUser = await createUser({
        username: pendingOAuthUser.email,
        password: '', // No password for OAuth users
        invite_code: 'OAUTH-AUTO', // Auto-created OAuth users
        current_question: 0,
        correct_count: 0,
        partial_count: 0,
        incorrect_count: 0,
        question_results: [],
        completed: false,
        best_score: 0,
        last_session_date: null,
        notification_enabled: true, // Default to ON for new users
        notification_time: '09:00', // Default to 9 AM
      });

      if (newUser) {
        // await markInviteCodeAsUsed(inviteCode, pendingOAuthUser.email); // DISABLED

        // Auto-login
        await storeLoggedInUser(pendingOAuthUser.email);
        setCurrentUser(newUser);

        // Reset state
        setPendingOAuthUser(null);
        setShowInviteCodePrompt(false);
        setInviteCode('');

        // Navigate to the Main tab navigator, which will show You tab
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      } else {
        setError('Error creating account');
      }
    } catch (error) {
      setError('Error creating account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show invite code prompt if needed
  if (showInviteCodePrompt) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Enter Invite Code</Text>
          <Text style={styles.subtitle}>
            An invite code is required to create a new account
          </Text>

          <Card>
            <Input
              label="Invite Code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              error={error}
              placeholder="Enter your invite code"
            />
            <Button
              title="Create Account"
              onPress={handleInviteCodeSubmit}
              loading={isLoading}
            />
            <Button
              title="Cancel"
              onPress={() => {
                setShowInviteCodePrompt(false);
                setPendingOAuthUser(null);
                setInviteCode('');
                setError('');
              }}
              variant="secondary"
              style={styles.cancelButton}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>AI Citizenship Quiz</Text>
          <Text style={styles.appDescription}>
            Prepare for your US Citizenship civics test with AI-powered feedback. Choose your test version and quiz mode to get started!
          </Text>
        </View>

        <View style={styles.loginSection}>
          <Text style={styles.loginTitle}>Sign In to Continue</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          <GoogleSignInButton
            onPress={handleGoogleSignIn}
            loading={isLoading}
          />
        </View>
      </View>

      {/* Welcome Modal */}
      <WelcomeModal
        visible={showWelcomeModal}
        onDismiss={handleWelcomeModalDismiss}
        isNewUser={isNewUser}
      />
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing.lg,
  },
  appTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  appDescription: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  loginSection: {
    marginTop: Spacing.xxxl,
  },
  loginTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: Spacing.md,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
});
