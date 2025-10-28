import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import AppleSignin from 'react-apple-signin-auth';
import { Button, Input, Card, WelcomeModal, Header } from '../components';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { useQuizStore, storeLoggedInUser } from '../store/quizStore';
import {
  getUser,
  createUser,
  updateUser,
} from '../services/supabase';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Google OAuth Client ID for web
const GOOGLE_WEB_CLIENT_ID = '359536687611-jeqab1murfjb02o51mt5pi7g290gtggt.apps.googleusercontent.com';

// Apple OAuth Client ID (Service ID) - You'll need to configure this in Apple Developer Console
const APPLE_CLIENT_ID = 'com.theeclodapps.citizenshipquiz.web';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);

  // OAuth state
  const [isLoading, setIsLoading] = useState(false);

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Error state
  const [error, setError] = useState('');

  // Handle welcome modal dismiss
  const handleWelcomeModalDismiss = () => {
    setShowWelcomeModal(false);

    // Always navigate to Main first, then let the tab navigator handle the rest
    navigation.navigate('Main' as never, {
      screen: isNewUser ? 'Session' : 'You',
      params: isNewUser ? { screen: 'ModeSelection' } : undefined,
    } as never);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setIsLoading(true);

    try {
      // Decode JWT to get user info
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const email = decoded.email;
      const name = decoded.name || decoded.given_name || 'User';
      const photo = decoded.picture || null; // Google profile picture

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // Update profile picture on every login if photo is available
        if (photo && photo !== existingUser.profile_picture) {
          const updatedUser = await updateUser(email, { profile_picture: photo });
          if (updatedUser) {
            await storeLoggedInUser(email);
            setCurrentUser(updatedUser);
            // Check if this is first login (no mode/test_version selected yet)
            const isFirstLogin = !updatedUser.mode && !updatedUser.test_version;
            setIsNewUser(isFirstLogin);
            setShowWelcomeModal(true);
          } else {
            // Failed to update, use existing user
            await storeLoggedInUser(email);
            setCurrentUser(existingUser);
            // Check if this is first login (no mode/test_version selected yet)
            const isFirstLogin = !existingUser.mode && !existingUser.test_version;
            setIsNewUser(isFirstLogin);
            setShowWelcomeModal(true);
          }
        } else {
          // No photo update needed
          await storeLoggedInUser(email);
          setCurrentUser(existingUser);
          // Check if this is first login (no mode/test_version selected yet)
          const isFirstLogin = !existingUser.mode && !existingUser.test_version;
          setIsNewUser(isFirstLogin);
          setShowWelcomeModal(true);
        }
      } else {
        // New user - create account with immediate access (granted)
        const newUser = await createUser({
          username: email,
          password: '', // No password for OAuth users
          profile_picture: photo, // Store Google profile picture
          current_question: 0,
          correct_count: 0,
          partial_count: 0,
          incorrect_count: 0,
          question_results: [],
          completed: false,
          best_score: 0,
          last_session_date: null,
          mode: undefined,
          test_version: undefined,
          session_status: 'not_started',
          shuffled_question_indices: [],
          subscription_tier: 'free',
          subscription_expires_at: null,
          questions_answered_today: 0,
          questions_reset_at: new Date().toISOString(),
          access_status: 'granted', // New users get immediate access
          access_requested_at: new Date().toISOString(),
        });

        if (newUser) {
          // Log in immediately
          await storeLoggedInUser(email);
          setCurrentUser(newUser);
          setIsNewUser(true); // Always true for new users
          setShowWelcomeModal(true);
        } else {
          setError('Failed to create account. Please try again.');
        }
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In was cancelled or failed.');
    setIsLoading(false);
  };

  const handleAppleSuccess = async (response: any) => {
    setError('');
    setIsLoading(true);

    try {
      // Apple returns user info in the authorization object
      const { authorization, user } = response;

      // Decode the ID token to get email
      const decoded = JSON.parse(atob(authorization.id_token.split('.')[1]));
      const email = decoded.email;
      const name = user?.name ? `${user.name.firstName} ${user.name.lastName}` : email.split('@')[0];

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // Existing user - log in
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
        const isFirstLogin = !existingUser.mode && !existingUser.test_version;
        setIsNewUser(isFirstLogin);
        setShowWelcomeModal(true);
      } else {
        // New user - create account with immediate access (granted)
        const newUser = await createUser({
          username: email,
          password: '', // No password for OAuth users
          profile_picture: null, // Apple doesn't provide profile pictures
          current_question: 0,
          correct_count: 0,
          partial_count: 0,
          incorrect_count: 0,
          question_results: [],
          completed: false,
          best_score: 0,
          last_session_date: null,
          mode: undefined,
          test_version: undefined,
          session_status: 'not_started',
          shuffled_question_indices: [],
          subscription_tier: 'free',
          subscription_expires_at: null,
          questions_answered_today: 0,
          questions_reset_at: new Date().toISOString(),
          access_status: 'granted', // New users get immediate access
          access_requested_at: new Date().toISOString(),
        });

        if (newUser) {
          // Log in immediately
          await storeLoggedInUser(email);
          setCurrentUser(newUser);
          setIsNewUser(true); // Always true for new users
          setShowWelcomeModal(true);
        } else {
          setError('Failed to create account. Please try again.');
        }
      }
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      setError('Failed to sign in with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleError = (error: any) => {
    console.error('Apple Sign-In Error:', error);
    setError('Apple Sign-In was cancelled or failed.');
    setIsLoading(false);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.appTitle}>AI Citizenship Quiz</Text>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.appIcon}
                resizeMode="contain"
              />
              <Text style={styles.subtitle}>
                Practice for your US Citizenship test with AI-powered feedback
              </Text>
            </View>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Sign In to Get Started</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Signing in...</Text>
                </View>
              ) : (
                <View style={styles.oauthContainer}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_blue"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                  />

                  <View style={styles.appleButtonContainer}>
                    <AppleSignin
                      authOptions={{
                        clientId: APPLE_CLIENT_ID,
                        scope: 'email name',
                        redirectURI: 'https://www.theeclodapps.com',
                        state: 'state',
                        nonce: 'nonce',
                        usePopup: true,
                      }}
                      uiType="dark"
                      className="apple-auth-button"
                      onSuccess={handleAppleSuccess}
                      onError={handleAppleError}
                    />
                  </View>
                </View>
              )}

              {!isLoading && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ✨ Sign in to get started{'\n'}
                    📱 Your progress is saved to your account{'\n'}
                    🔒 We never share your data
                  </Text>
                </View>
              )}
            </Card>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2025 Copyright TheeClodApps</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Welcome Modal */}
        <WelcomeModal
          visible={showWelcomeModal}
          onDismiss={handleWelcomeModalDismiss}
          isNewUser={isNewUser}
        />
      </SafeAreaView>
    </GoogleOAuthProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  appIcon: {
    width: 120,
    height: 120,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.base,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  oauthContainer: {
    marginVertical: Spacing.md,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#c00',
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  infoBox: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    lineHeight: 20,
  },
  accessBox: {
    backgroundColor: '#fff4e6',
    borderWidth: 1,
    borderColor: '#ffd699',
    borderRadius: 8,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  accessTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  accessText: {
    fontSize: FontSizes.base,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  accessEmail: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  appleButtonContainer: {
    marginTop: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
});
