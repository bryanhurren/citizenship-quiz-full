import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, GoogleSignInButton } from '../components';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { useQuizStore, storeLoggedInUser } from '../store/quizStore';
import {
  getUser,
  createUser,
  validateInviteCode,
  markInviteCodeAsUsed,
} from '../services/supabase';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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

  // Error state
  const [error, setError] = useState('');

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

      // Extract user info from Apple credential
      const email = credential.email || `${credential.user}@privaterelay.appleid.com`;
      const name = credential.fullName?.givenName || 'User';

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // User exists, log them in
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
        // Navigate to the Main tab navigator, which will show You tab
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      } else {
        // New user - auto-create account (invite code disabled)
        setPendingOAuthUser({ email, name, provider: 'apple' });
        await handleInviteCodeSubmit();
      }
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        // User canceled the sign-in
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

      if (!email) {
        throw new Error('No email received from Google Sign-In');
      }

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // User exists, log them in
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
        // Navigate to the Main tab navigator, which will show You tab
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      } else {
        // New user - auto-create account (invite code disabled)
        setPendingOAuthUser({ email, name, provider: 'google' });
        await handleInviteCodeSubmit();
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Login or Create Account</Text>
        <Text style={styles.subtitle}>
          Sign in with Apple or Google to continue
        </Text>

        <Card>
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
        </Card>

        <Text style={styles.footerText}>
          Sign in to create an account and track your progress
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: Colors.background,
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
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
});
