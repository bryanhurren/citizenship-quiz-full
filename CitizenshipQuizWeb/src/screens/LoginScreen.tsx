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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Button, Input, Card, WelcomeModal, Header } from '../components';
import { Colors, Spacing, FontSizes } from '../constants/theme';
import { useQuizStore, storeLoggedInUser } from '../store/quizStore';
import {
  getUser,
  createUser,
  validateInviteCode,
  markInviteCodeAsUsed,
  updateUser,
  requestAccess,
} from '../services/supabase';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Google OAuth Client ID for web
const GOOGLE_WEB_CLIENT_ID = '359536687611-jeqab1murfjb02o51mt5pi7g290gtggt.apps.googleusercontent.com';

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
    provider: 'google';
  } | null>(null);

  // Access request state
  const [accessStatus, setAccessStatus] = useState<'pending' | 'denied' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Error state
  const [error, setError] = useState('');

  // Handle welcome modal dismiss
  const handleWelcomeModalDismiss = () => {
    setShowWelcomeModal(false);

    if (isNewUser) {
      // New user - navigate to Mode Selection
      (navigation as any).navigate('Session', {
        screen: 'ModeSelection',
      });
    } else {
      // Existing user - navigate to You tab (Main)
      navigation.navigate('Main' as never);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setIsLoading(true);
    setAccessStatus(null);

    try {
      // Decode JWT to get user info
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const email = decoded.email;
      const name = decoded.name || decoded.given_name || 'User';
      const photo = decoded.picture || null; // Google profile picture

      setUserEmail(email);

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // Update profile picture on every login if photo is available
        if (photo && photo !== existingUser.profile_picture) {
          const updatedUser = await updateUser(email, { profile_picture: photo });
          if (updatedUser) {
            // Check access status with updated user
            if (updatedUser.access_status === 'granted') {
              await storeLoggedInUser(email);
              setCurrentUser(updatedUser);
              // Check if this is first login after access granted (no mode/test_version selected yet)
              const isFirstLogin = !updatedUser.mode && !updatedUser.test_version;
              setIsNewUser(isFirstLogin);
              setShowWelcomeModal(true);
            } else if (updatedUser.access_status === 'pending') {
              setAccessStatus('pending');
            } else if (updatedUser.access_status === 'denied') {
              setAccessStatus('denied');
            }
          } else {
            // Failed to update, use existing user
            if (existingUser.access_status === 'granted') {
              await storeLoggedInUser(email);
              setCurrentUser(existingUser);
              // Check if this is first login after access granted (no mode/test_version selected yet)
              const isFirstLogin = !existingUser.mode && !existingUser.test_version;
              setIsNewUser(isFirstLogin);
              setShowWelcomeModal(true);
            } else if (existingUser.access_status === 'pending') {
              setAccessStatus('pending');
            } else if (existingUser.access_status === 'denied') {
              setAccessStatus('denied');
            }
          }
        } else {
          // No photo update needed
          if (existingUser.access_status === 'granted') {
            await storeLoggedInUser(email);
            setCurrentUser(existingUser);
            // Check if this is first login after access granted (no mode/test_version selected yet)
            const isFirstLogin = !existingUser.mode && !existingUser.test_version;
            setIsNewUser(isFirstLogin);
            setShowWelcomeModal(true);
          } else if (existingUser.access_status === 'pending') {
            setAccessStatus('pending');
          } else if (existingUser.access_status === 'denied') {
            setAccessStatus('denied');
          } else {
            setError('Account status unknown. Please contact support.');
          }
        }
      } else {
        // New user - create account with pending access
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
          access_status: 'pending', // New users start with pending access
          access_requested_at: new Date().toISOString(),
        });

        if (newUser) {
          // Show access request message
          setAccessStatus('pending');
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

  const handleRequestAccess = async () => {
    if (!userEmail) return;

    setIsLoading(true);
    setError('');

    try {
      const success = await requestAccess(userEmail);
      if (success) {
        setAccessStatus('pending');
      } else {
        setError('Failed to request access. Please try again.');
      }
    } catch (error) {
      console.error('Request Access Error:', error);
      setError('Failed to request access. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

              {accessStatus === 'pending' ? (
                <View style={styles.accessBox}>
                  <Text style={styles.accessTitle}>🕐 Access Request Pending</Text>
                  <Text style={styles.accessText}>
                    Your access request has been submitted. An administrator will review your request and grant access soon.
                  </Text>
                  <Text style={styles.accessEmail}>Account: {userEmail}</Text>
                </View>
              ) : accessStatus === 'denied' ? (
                <View style={styles.accessBox}>
                  <Text style={[styles.accessTitle, { color: Colors.error }]}>❌ Access Denied</Text>
                  <Text style={styles.accessText}>
                    Your access request was denied. Please contact the administrator if you believe this is an error.
                  </Text>
                  <Text style={styles.accessEmail}>Account: {userEmail}</Text>
                </View>
              ) : isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Signing in...</Text>
                </View>
              ) : (
                <View style={styles.oauthContainer}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap
                    theme="filled_blue"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                  />
                </View>
              )}

              {!accessStatus && !isLoading && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ✨ New users will need access approval{'\n'}
                    📱 Your progress is saved to your account{'\n'}
                    🔒 We never share your data
                  </Text>
                </View>
              )}
            </Card>
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
});
