import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView, Image, TouchableOpacity, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Button, Card, Badge, Input, GoogleSignInButton, UpgradeModal } from '../components';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useQuizStore, clearLoggedInUser, storeLoggedInUser } from '../store/quizStore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  getUser,
  getUserByAppleId,
  createUser,
  updateUser,
  deleteUser,
  validateInviteCode,
  markInviteCodeAsUsed,
  getUserSessions,
  getProgressStats,
  resetProgress,
} from '../services/supabase';
import {
  registerForPushNotificationsAsync,
  scheduleDailyReminder,
  cancelAllNotifications,
} from '../services/notifications';
import { setHasCreatedAccount } from '../services/guestMode';
import { Session, ProgressStats } from '../types';
import {
  initializePurchases,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/purchases';
import { allQuestions } from '../data/questions';
import { allQuestions2025 } from '../data/questions-2025';

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // Zustand store
  const currentUser = useQuizStore((state) => state.currentUser);
  const correctCount = useQuizStore((state) => state.correctCount);
  const partialCount = useQuizStore((state) => state.partialCount);
  const incorrectCount = useQuizStore((state) => state.incorrectCount);
  const currentQuestion = useQuizStore((state) => state.currentQuestion);
  const selectedMode = useQuizStore((state) => state.selectedMode);
  const selectedTestVersion = useQuizStore((state) => state.selectedTestVersion);
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);
  const loadSession = useQuizStore((state) => state.loadSession);
  const resetQuiz = useQuizStore((state) => state.resetQuiz);
  const setShuffledQuestions = useQuizStore((state) => state.setShuffledQuestions);
  const setCurrentQuestion = useQuizStore((state) => state.setCurrentQuestion);
  const setSelectedTestVersion = useQuizStore((state) => state.setSelectedTestVersion);
  const setSelectedMode = useQuizStore((state) => state.setSelectedMode);
  const isGuest = useQuizStore((state) => state.isGuest);

  // Check if there's an active session (from DB only - source of truth)
  const hasActiveSession = currentUser && currentUser !== 'guest' && currentUser.session_status === 'in_progress';

  // OAuth state
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteCodePrompt, setShowInviteCodePrompt] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [pendingOAuthUser, setPendingOAuthUser] = useState<{
    email: string;
    name: string;
    provider: 'apple' | 'google';
    photo?: string;
    appleUserId?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(currentUser?.notification_enabled || false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationTime, setNotificationTime] = useState(() => {
    if (currentUser?.notification_time) {
      const [hour, minute] = currentUser.notification_time.split(':').map(Number);
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return date;
    }
    const date = new Date();
    date.setHours(9, 0, 0, 0); // Default to 9 AM
    return date;
  });
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [progress2008, setProgress2008] = useState<ProgressStats | null>(null);
  const [progress2025, setProgress2025] = useState<ProgressStats | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Sync notification state with currentUser
  useEffect(() => {
    if (currentUser) {
      setNotificationEnabled(currentUser.notification_enabled);
    }
  }, [currentUser]);

  // Initialize RevenueCat when user logs in
  useEffect(() => {
    if (currentUser) {
      initializePurchases(currentUser.username);
    }
  }, [currentUser]);

  // Fetch past sessions when user logs in OR when screen is focused
  useEffect(() => {
    const fetchSessions = async () => {
      if (currentUser?.id && isFocused) {
        const sessions = await getUserSessions(currentUser.id);
        setPastSessions(sessions);
      }
    };
    fetchSessions();
  }, [currentUser?.id, isFocused]);

  // Load progress statistics
  React.useEffect(() => {
    const loadProgress = async () => {
      if (!currentUser) return;

      setIsLoadingProgress(true);
      try {
        const stats2008 = await getProgressStats(currentUser.username, '2008');
        const stats2025 = await getProgressStats(currentUser.username, '2025');

        setProgress2008(stats2008);
        setProgress2025(stats2025);
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [currentUser, isFocused]); // Reload when screen is focused

  // Don't auto-load session - it overwrites in-memory counters!
  // Only load when explicitly resuming a session

  const handleAppleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      console.log('Starting Apple Sign In...');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple Sign In successful, credential received');

      // Extract stable Apple user identifier
      const appleUserId = credential.user;

      // Extract email (only provided on first sign-in)
      const email = credential.email || `${appleUserId}@privaterelay.appleid.com`;
      const name = credential.fullName?.givenName || 'User';

      console.log('Checking if user exists by Apple ID...');

      // Add timeout to database calls
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database request timed out')), 10000)
      );

      // Try to find user by Apple user ID first (best practice)
      let existingUser = await Promise.race([
        getUserByAppleId(appleUserId),
        timeoutPromise
      ]).catch((err) => {
        console.error('Error checking user by Apple ID:', err);
        throw err;
      });

      // Fallback: Look up by email for backwards compatibility with existing users
      if (!existingUser && email) {
        console.log('User not found by Apple ID, checking by email...');
        existingUser = await Promise.race([
          getUser(email),
          timeoutPromise
        ]).catch((err) => {
          console.error('Error checking user by email:', err);
          throw err;
        });

        // If found by email, update their record with apple_user_id
        if (existingUser) {
          console.log('User found by email, updating with Apple ID...');
          const updated = await updateUser(existingUser.username, {
            apple_user_id: appleUserId
          });
          if (updated) existingUser = updated;
        }
      }

      console.log('User check complete:', existingUser ? 'User exists' : 'New user');

      if (existingUser) {
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
      } else {
        // New user - auto-create account (invite code disabled)
        setPendingOAuthUser({ email, name, provider: 'apple', appleUserId });
        await handleInviteCodeSubmit();
      }
    } catch (error: any) {
      console.error('Apple Sign In error:', error);

      if (error.code === 'ERR_CANCELED' || error.code === 'ERR_REQUEST_CANCELED') {
        setError('Sign in canceled');
      } else if (error.message?.includes('timeout')) {
        setError('Connection timeout. Please check your internet connection and try again.');
      } else {
        setError(`Error: ${error.message || 'Please try again.'}`);
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

      const data = response.data || response;
      const user = data.user || data;

      const email = user?.email || data?.email;
      const name = user?.givenName || user?.name || data?.givenName || data?.name || 'User';
      const photo = user?.photo || data?.photo || null;

      if (!email) {
        throw new Error('No email received from Google Sign-In');
      }

      const existingUser = await getUser(email);

      if (existingUser) {
        // Update profile picture on every login if photo is available
        if (photo) {
          const updatedUser = await updateUser(email, { profile_picture: photo });
          if (updatedUser) {
            await storeLoggedInUser(email);
            setCurrentUser(updatedUser);
          } else {
            await storeLoggedInUser(email);
            setCurrentUser(existingUser);
          }
        } else {
          await storeLoggedInUser(email);
          setCurrentUser(existingUser);
        }
      } else {
        // New user - auto-create account (invite code disabled)
        setPendingOAuthUser({ email, name, provider: 'google', photo });
        await handleInviteCodeSubmit();
      }
    } catch (error: any) {
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
      // TEMPORARILY DISABLED - Request notification permission during account creation
      // const notificationToken = await registerForPushNotificationsAsync();
      const notificationToken = null; // TEMP: Disabled notifications

      const newUser = await createUser({
        username: pendingOAuthUser.email,
        password: '',
        apple_user_id: pendingOAuthUser.appleUserId || null,
        profile_picture: pendingOAuthUser.photo || null,
        // invite_code: inviteCode, // DISABLED
        current_question: 0,
        correct_count: 0,
        partial_count: 0,
        incorrect_count: 0,
        question_results: [],
        completed: false,
        best_score: 0,
        last_session_date: null,
        // Premium tier fields
        subscription_tier: 'free',
        subscription_expires_at: null,
        notification_enabled: notificationToken ? true : false, // ON by default if permission granted
        notification_time: '09:00', // Default to 9 AM
        last_notification_sent: null,
        questions_answered_today: 0,
        questions_reset_at: new Date().toISOString(),
      });

      if (newUser) {
        // await markInviteCodeAsUsed(inviteCode, pendingOAuthUser.email); // DISABLED
        await storeLoggedInUser(pendingOAuthUser.email);
        await setHasCreatedAccount();
        setCurrentUser(newUser);

        // TEMPORARILY DISABLED - If permission granted, schedule daily reminder
        // if (notificationToken) {
        //   await scheduleDailyReminder('09:00');
        // }

        setPendingOAuthUser(null);
        setShowInviteCodePrompt(false);
        setInviteCode('');
      } else {
        setError('Error creating account');
      }
    } catch (error) {
      setError('Error creating account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearLoggedInUser();
          // Reset all quiz state to prevent data leaking to next user
          resetQuiz();
          setCurrentUser(null);
          // Navigate to Login screen
          navigation.navigate('Login' as never);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    if (!currentUser || currentUser === 'guest') return;

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including quiz progress and session history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await deleteUser(currentUser.username);

              if (success) {
                // Clear local data
                await clearLoggedInUser();
                resetQuiz();
                setCurrentUser(null);

                Alert.alert(
                  'Account Deleted',
                  'Your account has been permanently deleted.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('Login' as never),
                    },
                  ]
                );
              } else {
                Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
              }
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpgradePress = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgradeConfirm = async () => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      // Ensure RevenueCat is initialized before getting offerings
      await initializePurchases(currentUser.username);

      // Get available offerings
      const offerings = await getOfferings();

      if (!offerings || !offerings.availablePackages || offerings.availablePackages.length === 0) {
        Alert.alert(
          'Unavailable',
          'In-app purchases are currently unavailable. This may be because:\n\n• You\'re using a simulator (purchases only work on real devices)\n• Products are still being configured in App Store Connect\n\nPlease try again later or contact support.'
        );
        setShowUpgradeModal(false);
        setIsLoading(false);
        return;
      }

      // Get the weekly package
      const weeklyPackage = offerings.availablePackages.find(
        pkg => pkg.product.identifier === 'weekly_premium_subscription'
      ) || offerings.availablePackages[0];

      // Make the purchase
      const { customerInfo, error } = await purchasePackage(weeklyPackage);

      if (error) {
        if (error.message !== 'Purchase cancelled') {
          Alert.alert('Purchase Failed', error.message || 'Unable to complete purchase. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (customerInfo) {
        // Get expiration date from RevenueCat entitlement
        const premiumEntitlement = customerInfo.entitlements.active['premium'];

        // Get expiration date from entitlement
        // Default to +7 days if RevenueCat doesn't provide one
        let expiresAt: string;

        if (premiumEntitlement?.expirationDate) {
          expiresAt = new Date(premiumEntitlement.expirationDate).toISOString();
        } else {
          // Fallback: Set expiration to 7 days from now
          const defaultExpiration = new Date();
          defaultExpiration.setDate(defaultExpiration.getDate() + 7);
          expiresAt = defaultExpiration.toISOString();
        }

        // Update user in database
        const updatedUser = await updateUser(currentUser.username, {
          subscription_tier: 'premium',
          subscription_expires_at: expiresAt,
        });

        if (updatedUser) {
          setCurrentUser(updatedUser);
          setShowUpgradeModal(false);
          Alert.alert(
            'Welcome to Premium!',
            'You now have unlimited access to all quiz questions. Thank you for your support!'
          );
        } else {
          Alert.alert('Error', 'Purchase successful but failed to update your account. Please contact support.');
        }
      }
    } catch (error: any) {
      console.error('Error during upgrade:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    // On Android, picker closes immediately so we can process
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedDate) {
        handleTimeConfirm(selectedDate);
      }
    } else {
      // On iOS, just update the local state as user scrolls
      // Don't save to DB or reschedule notifications until they click "Done"
      if (selectedDate) {
        setNotificationTime(selectedDate);
      }
    }
  };

  const handleTimeConfirm = async (selectedDate: Date) => {
    if (!currentUser) return;

    // Format time as HH:MM
    const hours = selectedDate.getHours().toString().padStart(2, '0');
    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    // Update database
    const updatedUser = await updateUser(currentUser.username, {
      notification_time: timeString,
    });

    if (updatedUser) {
      setCurrentUser(updatedUser);

      // ONLY reschedule notifications if they're enabled
      if (currentUser.notification_enabled) {
        await scheduleDailyReminder(timeString);
      }
    }
  };

  const handleResetProgress = (testVersion: '2008' | '2025') => {
    Alert.alert(
      'Reset Progress?',
      `This will clear all progress for the ${testVersion} test. You can start fresh with all questions. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;

            try {
              await resetProgress(currentUser.username, testVersion);

              // Reload progress
              const stats = await getProgressStats(currentUser.username, testVersion);
              if (testVersion === '2008') {
                setProgress2008(stats);
              } else {
                setProgress2025(stats);
              }

              Alert.alert('Progress Reset', `Your ${testVersion} test progress has been cleared.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset progress. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (!currentUser) return;

    if (value) {
      // Enabling notifications - Request permission first
      const token = await registerForPushNotificationsAsync();

      if (!token) {
        Alert.alert(
          'Permission Required',
          'Notifications are disabled in your device settings. Would you like to open Settings to enable them?',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      // Get time string from current notification time
      const hours = notificationTime.getHours().toString().padStart(2, '0');
      const minutes = notificationTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      // Schedule daily reminder with user's selected time
      const notificationId = await scheduleDailyReminder(timeString);

      if (!notificationId) {
        Alert.alert('Error', 'Failed to schedule daily reminder');
        return;
      }

      setNotificationEnabled(true);

      // Update database
      const updatedUser = await updateUser(currentUser.username, {
        notification_enabled: true,
        notification_time: timeString,
      });

      if (updatedUser) {
        setCurrentUser(updatedUser);
      } else {
        // Revert on error
        await cancelAllNotifications();
        setNotificationEnabled(false);
        Alert.alert('Error', 'Failed to update notification settings');
      }
    } else {
      // Disabling notifications
      await cancelAllNotifications();
      setNotificationEnabled(false);

      // Update database
      const updatedUser = await updateUser(currentUser.username, {
        notification_enabled: false,
      });

      if (updatedUser) {
        setCurrentUser(updatedUser);
      } else {
        // Revert on error
        setNotificationEnabled(true);
        // TEMPORARILY DISABLED - const hours = notificationTime.getHours().toString().padStart(2, '0');
        // const minutes = notificationTime.getMinutes().toString().padStart(2, '0');
        // await scheduleDailyReminder(`${hours}:${minutes}`);
        Alert.alert('Error', 'Failed to update notification settings');
      }
    }
  };

  const handleResumeSession = async () => {
    if (!currentUser) return;

    // Check if there's an active session
    const sessionExists = currentUser?.session_status === 'in_progress';

    if (!sessionExists) {
      Alert.alert('No Session', 'No session in progress to resume.');
      return;
    }

    try {
      // Load session metadata from database
      await loadSession();

      // Use centralized restoration logic
      const restoreSessionQuestions = useQuizStore.getState().restoreSessionQuestions;
      const result = await restoreSessionQuestions(allQuestions, allQuestions2025);

      if (!result.success) {
        Alert.alert(
          'Cannot Resume Session',
          result.error || 'Failed to load session. Please start a new quiz.',
          [
            {
              text: 'Start New Quiz',
              onPress: () => navigation.navigate('Session' as never, { screen: 'ModeSelection' } as never)
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // Set restored questions
      setShuffledQuestions(result.questions);

      // Get updated state after restoration
      const storeState = useQuizStore.getState();
      if (storeState.selectedTestVersion) setSelectedTestVersion(storeState.selectedTestVersion);
      if (storeState.selectedMode) setSelectedMode(storeState.selectedMode);
      setCurrentQuestion(storeState.currentQuestion);

      // Show warning if we had to switch modes
      if (result.error) {
        Alert.alert('Notice', result.error, [
          { text: 'Continue', onPress: () => navigation.navigate('Session' as never, { screen: 'Quiz' } as never) }
        ]);
        return;
      }

      // Navigate to quiz screen
      navigation.navigate('Session' as never, { screen: 'Quiz' } as never);
    } catch (error) {
      console.error('Error resuming session:', error);
      Alert.alert('Error', 'Failed to resume session. Please try again or start a new quiz.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);

    // Get month name
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];

    // Get day with ordinal suffix
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd'
      : 'th';

    const year = date.getFullYear();

    return `${month} ${day}${suffix}, ${year}`;
  };

  // Format date as MM/DD/YYYY for Past Sessions table
  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format time as HH:MM am/pm
  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12; // Convert to 12-hour format
    return `${hours}:${minutes} ${ampm}`;
  };

  // Format date with time for Current Session
  const formatDateWithTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return `${formatDateShort(dateString)} / ${formatTime(dateString)}`;
  };

  const getScoreDisplay = () => {
    if (!currentUser) return 'N/A';
    if (currentUser.completed) {
      const total = currentUser.test_version === '2025' ? 128 : 100;
      const percentage = Math.round((currentUser.correct_count / total) * 100);
      return `${currentUser.correct_count}/${total} (${percentage}%)`;
    }
    return 'In Progress';
  };

  const getPassingStatus = () => {
    if (!currentUser || !currentUser.completed) return null;
    const threshold = currentUser.test_version === '2025' ? 77 : 60;
    return currentUser.correct_count >= threshold ? 'PASSED' : 'NOT PASSED';
  };

  // Show invite code prompt if needed
  if (showInviteCodePrompt) {
    return (
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
    );
  }

  // Not logged in state - show OAuth login
  if (!currentUser) {
    return (
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
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card - Only for logged-in users */}
        {!isGuest() && (
          <Card>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarContainer}>
                  {currentUser.profile_picture ? (
                    <Image
                      source={{ uri: currentUser.profile_picture }}
                      style={styles.profilePicture}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {currentUser.username.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                {currentUser.subscription_tier === 'premium' && (
                  <View style={styles.trophyBadge}>
                    <Text style={styles.trophyIcon}>🏆</Text>
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">{currentUser.username}</Text>
                <View style={styles.subscriptionRow}>
                  <Text style={styles.subscriptionLabel}>Subscription Tier: </Text>
                  <Text style={styles.tierText}>
                    {currentUser.subscription_tier === 'premium' ? 'Premium' : 'Free'}
                  </Text>
                  {currentUser.subscription_tier === 'free' && (
                    <TouchableOpacity onPress={handleUpgradePress}>
                      <Text style={styles.upgradeLink}>upgrade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Card>
        )}

      {/* Progress Section */}
      {!isLoadingProgress && (progress2008?.totalAsked > 0 || progress2025?.totalAsked > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Progress</Text>

          {/* 2008 Test Progress */}
          {progress2008 && progress2008.totalAsked > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>2008 Test Progress</Text>
                {progress2008.totalCorrect === progress2008.totalQuestions && (
                  <View style={styles.perfectBadge}>
                    <Text style={styles.perfectBadgeText}>Perfect Score</Text>
                  </View>
                )}
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                {/* Correct (Green) */}
                <View
                  style={[
                    styles.progressSegment,
                    styles.progressCorrect,
                    { width: `${(progress2008.totalCorrect / progress2008.totalQuestions) * 100}%` }
                  ]}
                />
                {/* Attempted but incorrect (Yellow) */}
                <View
                  style={[
                    styles.progressSegment,
                    styles.progressAttempted,
                    { width: `${(progress2008.totalIncorrect / progress2008.totalQuestions) * 100}%` }
                  ]}
                />
                {/* Remaining (Gray) */}
                <View
                  style={[
                    styles.progressSegment,
                    styles.progressRemaining,
                    { width: `${((progress2008.totalQuestions - progress2008.totalAsked) / progress2008.totalQuestions) * 100}%` }
                  ]}
                />
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <Text style={styles.statText}>
                  {progress2008.totalAsked} attempted
                </Text>
                <Text style={styles.statText}>
                  {progress2008.totalCorrect} correct
                </Text>
                <Text style={styles.statText}>
                  {progress2008.totalQuestions - progress2008.totalAsked} remaining
                </Text>
              </View>

              {/* Reset Button (if all mastered) */}
              {progress2008.totalCorrect === progress2008.totalQuestions && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleResetProgress('2008')}
                >
                  <Text style={styles.resetButtonText}>Reset Progress</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 2025 Test Progress (same structure) */}
          {progress2025 && progress2025.totalAsked > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>2025 Test Progress</Text>
                {progress2025.totalCorrect === progress2025.totalQuestions && (
                  <View style={styles.perfectBadge}>
                    <Text style={styles.perfectBadgeText}>Perfect Score</Text>
                  </View>
                )}
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressSegment,
                    styles.progressCorrect,
                    { width: `${(progress2025.totalCorrect / progress2025.totalQuestions) * 100}%` }
                  ]}
                />
                <View
                  style={[
                    styles.progressSegment,
                    styles.progressAttempted,
                    { width: `${(progress2025.totalIncorrect / progress2025.totalQuestions) * 100}%` }
                  ]}
                />
                <View
                  style={[
                    styles.progressSegment,
                    styles.progressRemaining,
                    { width: `${((progress2025.totalQuestions - progress2025.totalAsked) / progress2025.totalQuestions) * 100}%` }
                  ]}
                />
              </View>

              <View style={styles.statsRow}>
                <Text style={styles.statText}>
                  {progress2025.totalAsked} attempted
                </Text>
                <Text style={styles.statText}>
                  {progress2025.totalCorrect} correct
                </Text>
                <Text style={styles.statText}>
                  {progress2025.totalQuestions - progress2025.totalAsked} remaining
                </Text>
              </View>

              {progress2025.totalCorrect === progress2025.totalQuestions && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleResetProgress('2025')}
                >
                  <Text style={styles.resetButtonText}>Reset Progress</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Current Session */}
      <Card>
        <Text style={styles.sectionTitle}>Current Session</Text>
        {hasActiveSession ? (
          <>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Test Version:</Text>
              <Badge
                text={selectedTestVersion || currentUser.test_version || '2008'}
                variant="primary"
              />
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Mode:</Text>
              <Badge
                text={selectedMode || currentUser.mode || 'formal'}
                variant={(selectedMode || currentUser.mode) === 'formal' ? 'formal' : 'comedy'}
              />
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Status:</Text>
              <Text style={styles.sessionValue}>In Progress</Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Progress:</Text>
              <Text style={styles.sessionValue}>
                Question {currentQuestion + 1} of{' '}
                {(selectedTestVersion || currentUser.test_version) === '2025' ? 20 : 10}
              </Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Score:</Text>
              <Text style={styles.sessionValue}>
                {correctCount} Correct / {incorrectCount} Incorrect
              </Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Last Updated:</Text>
              <Text style={styles.sessionValue}>
                {formatDateWithTime(currentUser.last_session_date)}
              </Text>
            </View>

            {/* Resume Button - ONLY for in_progress sessions */}
            <Button
              title="Resume Session"
              onPress={handleResumeSession}
              style={styles.resumeButton}
            />
          </>
        ) : (
          <>
            <Text style={styles.noSessionText}>
              No session in progress. Start a new session to begin your citizenship quiz.
            </Text>
            {/* Start New Session - ONLY when no in_progress session */}
            <Button
              title="Start New Session"
              onPress={() =>
                navigation.navigate('Session' as never, {
                  screen: 'ModeSelection',
                } as never)
              }
              style={styles.startButton}
            />
          </>
        )}
      </Card>

      {/* Past Sessions - Only for logged-in users */}
      {!isGuest() && (
        <Card>
          <Text style={styles.sectionTitle}>Past Sessions</Text>
          <View style={styles.pastSessionsContainer}>
            {pastSessions.length > 0 ? (
            <>
              <View style={styles.pastSessionTable}>
                {/* Table Header */}
                <View style={styles.tableRow}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date / Time</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Score</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Result</Text>
                </View>

                {/* Table Data Rows - Show only first 5 */}
                {pastSessions.slice(0, 5).map((session) => {
                  const maxQuestions = session.test_version === '2025' ? 20 : 10;
                  const passThreshold = session.test_version === '2025' ? 12 : 6;
                  const sessionPassed = session.correct_count >= passThreshold;

                  return (
                    <View key={session.id} style={styles.tableRow}>
                      <Text style={[styles.tableCellText, { flex: 2 }]} numberOfLines={1}>
                        {formatDateShort(session.completed_at)} / {formatTime(session.completed_at)}
                      </Text>
                      <Text style={[styles.tableCellText, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                        {session.correct_count}/{session.total_questions_asked}
                      </Text>
                      <Text
                        style={[
                          styles.tableCellText,
                          { flex: 1, textAlign: 'center', fontWeight: '600' },
                          { color: sessionPassed ? Colors.correct : Colors.incorrect }
                        ]}
                        numberOfLines={1}
                      >
                        {session.session_status === 'passed' ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Show "See all Past Sessions" link if there are more than 5 */}
              {pastSessions.length > 5 && (
                <TouchableOpacity
                  style={styles.seeAllLink}
                  onPress={() => navigation.navigate('PastSessions' as never)}
                >
                  <Text style={styles.seeAllText}>See all Past Sessions</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
              <Text style={styles.noSessionText}>
                You have no past sessions yet.
              </Text>
            )}
          </View>
        </Card>
      )}

      {/* Account Actions */}
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>

        {isGuest() ? (
          /* Guest Mode - Show Login Options */
          <>
            <Text style={styles.guestMessage}>
              You're using the app as a guest. Create a free account to save your progress and access all features!
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
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
          </>
        ) : (
          /* Logged-in User - Show Notifications and Logout */
          <>
            {/* Daily Notification Toggle */}
            <View style={styles.notificationRow}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationLabel}>Daily Reminder</Text>
                <Text style={styles.notificationDescription}>
                  Get a notification every 24 hours to continue your session
                </Text>
                {notificationEnabled && (
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.timeButtonText}>
                      {notificationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.timeButtonLabel}>Tap to change time</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Switch
                value={notificationEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: Colors.textMuted, true: Colors.primary }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.textMuted}
              />
            </View>

            {/* Time Picker */}
            {showTimePicker && (
              <DateTimePicker
                value={notificationTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                onTouchCancel={() => setShowTimePicker(false)}
              />
            )}
            {Platform.OS === 'ios' && showTimePicker && (
              <Button
                title="Done"
                onPress={() => {
                  setShowTimePicker(false);
                  handleTimeConfirm(notificationTime);
                }}
                style={styles.timePickerDoneButton}
              />
            )}

            {/* Debug/Testing: Clear Session Button */}
            {hasActiveSession && (
              <Button
                title="Clear Active Session (Dev)"
                onPress={async () => {
                  Alert.alert(
                    'Clear Session?',
                    'This will clear your current session data. Use this for testing or if you\'re stuck in a bad state.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          if (!currentUser || currentUser === 'guest') return;

                          try {
                            await updateUser(currentUser.username, {
                              session_status: null,
                              current_question: 0,
                              correct_count: 0,
                              partial_count: 0,
                              incorrect_count: 0,
                              question_results: [],
                              shuffled_question_indices: [],
                              completed: false,
                            });

                            // Reset local state
                            resetQuiz();

                            // Reload user data
                            const freshUser = await getUser(currentUser.username);
                            if (freshUser) {
                              setCurrentUser(freshUser);
                            }

                            Alert.alert('Success', 'Session cleared successfully');
                          } catch (error) {
                            console.error('Error clearing session:', error);
                            Alert.alert('Error', 'Failed to clear session');
                          }
                        },
                      },
                    ]
                  );
                }}
                variant="secondary"
                style={styles.clearSessionButton}
              />
            )}

            <Button
              title="Delete Account"
              onPress={handleDeleteAccount}
              variant="danger"
              style={styles.deleteAccountButton}
            />

            <Button
              title="Logout"
              onPress={handleLogout}
              variant="secondary"
              style={styles.logoutButton}
            />
          </>
        )}

        {/* Legal Links - Always visible for all users */}
        <View style={styles.legalLinksContainer}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.theeclodapps.com/privacy.html')}
            style={styles.legalLink}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://www.theeclodapps.com/eula.html')}
            style={styles.legalLink}
          >
            <Text style={styles.legalLinkText}>EULA</Text>
          </TouchableOpacity>
        </View>
      </Card>

        {/* Upgrade Modal */}
        <UpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={handleUpgradeConfirm}
        />
      </ScrollView>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.white,
  },
  profilePicture: {
    width: 60,
    height: 60,
  },
  trophyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  trophyIcon: {
    fontSize: 14,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  subscriptionLabel: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
  },
  tierText: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.text,
  },
  upgradeLink: {
    fontSize: FontSizes.base,
    color: Colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sessionLabel: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
  },
  sessionValue: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.text,
  },
  noSessionText: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  resumeButton: {
    marginTop: Spacing.md,
  },
  startButton: {
    marginTop: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
  infoText: {
    fontSize: FontSizes.base,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  pastSessionsContainer: {
    marginTop: Spacing.sm,
  },
  pastSessionTable: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white,
  },
  tableHeaderText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textLight,
  },
  tableCellText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  futureNote: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  notificationInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  notificationLabel: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  notificationDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    lineHeight: 18,
  },
  deleteAccountButton: {
    marginBottom: Spacing.md,
  },
  clearSessionButton: {
    marginBottom: Spacing.md,
  },
  logoutButton: {
    marginBottom: 0,
  },
  timeButton: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  timeButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  timeButtonLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
  },
  timePickerDoneButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  seeAllLink: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: FontSizes.base,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  guestMessage: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  legalLink: {
    paddingHorizontal: Spacing.sm,
  },
  legalLinkText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
    backgroundColor: '#f9fafb',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#374151',
  },
  perfectBadge: {
    backgroundColor: Colors.correct,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  perfectBadgeText: {
    color: 'white',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  progressBar: {
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressSegment: {
    height: '100%',
  },
  progressCorrect: {
    backgroundColor: Colors.correct,
  },
  progressAttempted: {
    backgroundColor: Colors.partial,
  },
  progressRemaining: {
    backgroundColor: '#e5e7eb',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: FontSizes.sm,
    color: '#6b7280',
  },
  resetButton: {
    marginTop: Spacing.md,
    backgroundColor: '#ef4444',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
