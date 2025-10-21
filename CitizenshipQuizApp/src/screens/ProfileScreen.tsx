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
  createUser,
  updateUser,
  validateInviteCode,
  markInviteCodeAsUsed,
  getUserSessions,
} from '../services/supabase';
import {
  registerForPushNotificationsAsync,
  scheduleDailyReminder,
  cancelAllNotifications,
} from '../services/notifications';
import { Session } from '../types';
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

  // Check if there's an active session (either in DB or in memory)
  const hasActiveSession = currentUser?.session_status === 'in_progress' ||
    (correctCount > 0 || incorrectCount > 0 || currentQuestion > 0);

  // OAuth state
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteCodePrompt, setShowInviteCodePrompt] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [pendingOAuthUser, setPendingOAuthUser] = useState<{
    email: string;
    name: string;
    provider: 'apple' | 'google';
    photo?: string;
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

      const email = credential.email || `${credential.user}@privaterelay.appleid.com`;
      const name = credential.fullName?.givenName || 'User';

      console.log('Checking if user exists:', email);

      // Add timeout to database call
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database request timed out')), 10000)
      );

      const existingUser = await Promise.race([
        getUser(email),
        timeoutPromise
      ]).catch((err) => {
        console.error('Error checking user:', err);
        throw err;
      });

      console.log('User check complete:', existingUser ? 'User exists' : 'New user');

      if (existingUser) {
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
      } else {
        // New user - auto-create account (invite code disabled)
        setPendingOAuthUser({ email, name, provider: 'apple' });
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
      // Request notification permission during account creation
      const notificationToken = await registerForPushNotificationsAsync();

      const newUser = await createUser({
        username: pendingOAuthUser.email,
        password: '',
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
        setCurrentUser(newUser);

        // If permission granted, schedule daily reminder
        if (notificationToken) {
          await scheduleDailyReminder('09:00');
        }

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
          // DON'T reset quiz state - session data persists in database
          // It will be restored when user logs back in
          setCurrentUser(null);
          // Navigate to Login screen
          navigation.navigate('Login' as never);
        },
      },
    ]);
  };

  const handleUpgradePress = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgradeConfirm = async () => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      // Get available offerings
      const offerings = await getOfferings();

      if (!offerings || !offerings.availablePackages || offerings.availablePackages.length === 0) {
        Alert.alert(
          'Configuration Required',
          'In-app purchases are not configured yet. Please set up your RevenueCat account and products in App Store Connect.\n\nFor now, use the admin interface to manually upgrade users.'
        );
        setShowUpgradeModal(false);
        setIsLoading(false);
        return;
      }

      // Get the weekly package (assuming it's the first one)
      // TODO: Filter by product identifier if you have multiple packages
      const weeklyPackage = offerings.availablePackages[0];

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
        // Get expiration date from customer info
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7); // 1 week from now

        // Update user in database
        const updatedUser = await updateUser(currentUser.username, {
          subscription_tier: 'premium',
          subscription_expires_at: expirationDate.toISOString(),
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

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedDate && currentUser) {
      setNotificationTime(selectedDate);

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

        // If notifications are enabled, reschedule with new time
        if (currentUser.notification_enabled) {
          await scheduleDailyReminder(timeString);
        }
      }
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (!currentUser) return;

    if (value) {
      // Enabling notifications
      // Request permission first
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
        const hours = notificationTime.getHours().toString().padStart(2, '0');
        const minutes = notificationTime.getMinutes().toString().padStart(2, '0');
        await scheduleDailyReminder(`${hours}:${minutes}`);
        Alert.alert('Error', 'Failed to update notification settings');
      }
    }
  };

  const handleResumeSession = async () => {
    if (!currentUser) return;

    // Load session from database
    await loadSession();

    // Get fresh values from store after loadSession completes
    const storeState = useQuizStore.getState();

    // Check if there's actually a valid session to resume
    // A valid session must have:
    // 1. session_status = 'in_progress' in database
    // 2. A test_version selected
    // 3. Not completed
    const hasSession = storeState.currentUser?.session_status === 'in_progress' &&
                      storeState.currentUser?.test_version &&
                      !storeState.currentUser?.completed;

    if (hasSession) {
      // Restore shuffled questions from saved indices
      const questions = storeState.currentUser.test_version === '2025' ? allQuestions2025 : allQuestions;

      // If we have saved shuffle indices, use them to restore the exact order
      if (storeState.currentUser.shuffled_question_indices &&
          storeState.currentUser.shuffled_question_indices.length > 0) {
        const shuffled = storeState.currentUser.shuffled_question_indices.map(index => questions[index]);
        setShuffledQuestions(shuffled);
      } else {
        // Fallback: shuffle fresh (for old sessions before this fix)
        const shuffled = shuffleArray(questions);
        setShuffledQuestions(shuffled);
      }

      // Values already set by loadSession, but ensure they're applied
      if (storeState.selectedTestVersion) setSelectedTestVersion(storeState.selectedTestVersion);
      if (storeState.selectedMode) setSelectedMode(storeState.selectedMode);
      setCurrentQuestion(storeState.currentQuestion);

      // Navigate to quiz screen
      navigation.navigate('Session' as never, {
        screen: 'Quiz',
      } as never);
    } else {
      Alert.alert('No Session', 'No session in progress to resume.');
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
        {/* User Profile Card */}
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
            <Text style={styles.bestScore}>
              Best Score: {currentUser.best_score || 0}
            </Text>
          </View>
        </View>

        {/* Subscription Tier */}
        <View style={styles.subscriptionRow}>
          <View style={styles.subscriptionLeft}>
            <Text style={styles.subscriptionLabel}>Subscription Tier: </Text>
            <Text style={styles.tierText}>
              {currentUser.subscription_tier === 'premium' ? 'Premium' : 'Free'}
            </Text>
          </View>
          {currentUser.subscription_tier === 'free' && (
            <TouchableOpacity onPress={handleUpgradePress}>
              <Text style={styles.upgradeLink}>upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

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
                {formatDate(currentUser.last_session_date)}
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

      {/* Past Sessions - Always show */}
      <Card>
        <Text style={styles.sectionTitle}>Past Sessions</Text>
        <View style={styles.pastSessionsContainer}>
          {pastSessions.length > 0 ? (
            <View style={styles.pastSessionTable}>
              {/* Table Header */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>Ver</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>Mode</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Score</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Result</Text>
              </View>

              {/* Table Data Rows - Map over all sessions */}
              {pastSessions.map((session) => {
                const maxQuestions = session.test_version === '2025' ? 20 : 10;
                const passThreshold = session.test_version === '2025' ? 12 : 6;
                const sessionPassed = session.correct_count >= passThreshold;

                return (
                  <View key={session.id} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, { flex: 1.5 }]} numberOfLines={1}>
                      {formatDate(session.completed_at)}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 0.8, textAlign: 'center' }]}>
                      {session.test_version}
                    </Text>
                    <Text style={[styles.tableCellText, { flex: 0.8, textAlign: 'center' }]}>
                      {session.mode === 'formal' ? 'F' : 'C'}
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
          ) : (
            <Text style={styles.noSessionText}>
              You have no past sessions yet.
            </Text>
          )}
        </View>
      </Card>

      {/* Account Actions */}
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>

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
            onPress={() => setShowTimePicker(false)}
            style={styles.timePickerDoneButton}
          />
        )}

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
        />
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
  bestScore: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    marginTop: Spacing.sm,
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
