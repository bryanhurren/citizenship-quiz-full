import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Button, Card, Badge, Header, UpgradeModal } from '../components';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useQuizStore, clearLoggedInUser } from '../store/quizStore';
import { getUser, updateUser, getUserSessions, getProgressStats, resetProgress } from '../services/supabase';
import { allQuestions } from '../data/questions';
import { allQuestions2025 } from '../data/questions-2025';
import { shuffleArray } from '../utils/shuffle';
import { redirectToCheckout, cancelSubscription, deleteAccount } from '../services/stripe';
import { Session, ProgressStats } from '../types';

// Helper function to format dates
const formatDateWithTime = (dateString: string | null) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
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

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // Zustand store
  const currentUser = useQuizStore((state) => state.currentUser);
  const correctCount = useQuizStore((state) => state.correctCount);
  const partialCount = useQuizStore((state) => state.partialCount);
  const incorrectCount = useQuizStore((state) => state.incorrectCount);
  const currentQuestion = useQuizStore((state) => state.currentQuestion);
  const selectedTestVersion = useQuizStore((state) => state.selectedTestVersion);
  const selectedMode = useQuizStore((state) => state.selectedMode);
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);
  const resetQuiz = useQuizStore((state) => state.resetQuiz);
  const loadSession = useQuizStore((state) => state.loadSession);
  const setShuffledQuestions = useQuizStore((state) => state.setShuffledQuestions);

  // State for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);

  // State for past sessions
  const [pastSessions, setPastSessions] = useState<Session[]>([]);

  // State for progress tracking
  const [progress2008, setProgress2008] = useState<ProgressStats | null>(null);
  const [progress2025, setProgress2025] = useState<ProgressStats | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Check if there's an active session (from DB only - source of truth)
  const hasActiveSession = currentUser?.session_status === 'in_progress';

  // Refresh user data when screen is focused
  useEffect(() => {
    if (isFocused && currentUser) {
      refreshUserData();
    }
  }, [isFocused]);

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
  useEffect(() => {
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

  const refreshUserData = async () => {
    if (!currentUser) return;

    const updatedUser = await getUser(currentUser.username);
    if (updatedUser) {
      setCurrentUser(updatedUser);
    }
  };

  const handleLogout = async () => {
    // Use window.confirm for web compatibility instead of Alert
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      // Clear Google OAuth session
      if (typeof window !== 'undefined' && (window as any).google) {
        try {
          (window as any).google.accounts.id.disableAutoSelect();
        } catch (e) {
          console.log('Could not disable Google auto-select:', e);
        }
      }

      await clearLoggedInUser();
      resetQuiz();
      navigation.navigate('Login' as never);
    }
  };

  const handleUpgradePress = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgradeConfirm = async () => {
    if (!currentUser) return;

    // Detect Android Chrome and show helpful message
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);

    if (isAndroid && isChrome && !navigator.cookieEnabled) {
      window.alert(
        '⚠️ Cookies Required\n\n' +
        'Please enable cookies in Chrome to complete payment:\n' +
        '1. Tap the three dots (⋮) in Chrome\n' +
        '2. Go to Settings > Site settings > Cookies\n' +
        '3. Enable "Cookies"\n' +
        '4. Return and try again'
      );
      return;
    }

    try {
      console.log('Starting checkout for user:', currentUser.id, currentUser.username);
      await redirectToCheckout({
        userId: currentUser.id,
        userEmail: currentUser.username,
      });
    } catch (error) {
      console.error('Error starting checkout:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);

      let errorMessage = `Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}.`;

      // Add Android-specific troubleshooting advice
      if (isAndroid && isChrome) {
        errorMessage += '\n\n📱 Android Chrome Tips:\n' +
          '• Enable cookies in Chrome settings\n' +
          '• Enable "Payment methods" in Chrome settings\n' +
          '• Disable any ad blockers\n' +
          '• Try opening in an incognito window';
      }

      window.alert(errorMessage);
    }
  };

  const handleResumeSession = async () => {
    if (!currentUser) {
      return;
    }

    // Check if there's an active session BEFORE loading
    const sessionExists = currentUser?.session_status === 'in_progress' ||
      (correctCount > 0 || incorrectCount > 0 || currentQuestion > 0);

    if (!sessionExists) {
      window.alert('No session in progress to resume.');
      return;
    }

    try {
      // Load session from database
      await loadSession();

      // Get fresh values from store after loadSession completes
      const storeState = useQuizStore.getState();

      // Restore shuffled questions from saved indices
      const testVersion = storeState.selectedTestVersion || storeState.currentUser?.test_version || '2008';
      const questions = testVersion === '2025' ? allQuestions2025 : allQuestions;

      // If we have saved shuffle indices, use them to restore the exact order
      if (storeState.currentUser?.shuffled_question_indices &&
          storeState.currentUser.shuffled_question_indices.length > 0) {
        // Filter out invalid indices (bounds checking)
        const validIndices = storeState.currentUser.shuffled_question_indices.filter(
          (index: number) => index >= 0 && index < questions.length
        );

        if (validIndices.length > 0) {
          const shuffled = validIndices.map((index: number) => questions[index]);
          setShuffledQuestions(shuffled);
        } else {
          // If no valid indices, create fresh shuffle
          const shuffled = shuffleArray(questions);
          setShuffledQuestions(shuffled);
        }
      } else {
        // Fallback: shuffle fresh (for old sessions before this fix)
        const shuffled = shuffleArray(questions);
        setShuffledQuestions(shuffled);
      }

      // Navigate to quiz screen
      (navigation as any).navigate('Session', {
        screen: 'Quiz',
      });
    } catch (error) {
      console.error('Error resuming session:', error);
      window.alert('Error loading session. Please try again.');
    }
  };

  const handleViewPastSessions = () => {
    (navigation as any).navigate('PastSessions');
  };

  const handleCancelSubscription = async () => {
    if (!currentUser) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel your premium subscription?\n\n' +
      'You will keep premium access until the end of your current billing period.'
    );

    if (!confirmed) return;

    try {
      const result = await cancelSubscription(currentUser.id, currentUser.username);
      window.alert(
        `Subscription canceled successfully.\n\n` +
        `You will retain premium access until ${new Date(result.cancelAt).toLocaleDateString()}`
      );
      await refreshUserData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      window.alert('Failed to cancel subscription. Please try again or contact support.');
    }
  };

  const handleResetProgress = async (testVersion: '2008' | '2025') => {
    if (!currentUser) return;

    const confirmed = window.confirm(
      `Reset Progress?\n\n` +
      `This will clear all progress for the ${testVersion} test. You can start fresh with all questions. This cannot be undone.\n\n` +
      `Are you sure you want to reset?`
    );

    if (!confirmed) return;

    try {
      await resetProgress(currentUser.username, testVersion);

      // Reload progress
      const stats = await getProgressStats(currentUser.username, testVersion);
      if (testVersion === '2008') {
        setProgress2008(stats);
      } else {
        setProgress2025(stats);
      }

      window.alert(`Your ${testVersion} test progress has been cleared.`);
    } catch (error) {
      console.error('Error resetting progress:', error);
      window.alert('Failed to reset progress. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    const confirmed1 = window.confirm(
      '⚠️ WARNING: This will permanently delete your account and all your data.\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Are you sure you want to continue?'
    );

    if (!confirmed1) return;

    const confirmed2 = window.confirm(
      'This is your final warning.\n\n' +
      'All your quiz progress, scores, and account information will be permanently deleted.\n\n' +
      'Type DELETE in the next prompt to confirm.'
    );

    if (!confirmed2) return;

    const confirmation = window.prompt('Type DELETE to confirm account deletion:');

    if (confirmation !== 'DELETE') {
      window.alert('Account deletion canceled.');
      return;
    }

    try {
      await deleteAccount(currentUser.id, currentUser.username);
      window.alert('Your account has been permanently deleted.');

      // Clear local storage and log out
      await clearLoggedInUser();
      resetQuiz();
      navigation.navigate('Login' as never);
    } catch (error) {
      console.error('Error deleting account:', error);
      window.alert('Failed to delete account. Please try again or contact support.');
    }
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Please log in to view your profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPremium = currentUser.subscription_tier === 'premium';
  const isExpired = isPremium && currentUser.subscription_expires_at && new Date(currentUser.subscription_expires_at) < new Date();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <ScrollView style={styles.container}>
        {/* User Profile Card */}
        <Card style={styles.card}>
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
              {isPremium && !isExpired && (
                <View style={styles.trophyBadge}>
                  <Text style={styles.trophyIcon}>🏆</Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
                {currentUser.username}
              </Text>
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Subscription Tier: </Text>
                <Text style={styles.tierText}>
                  {isPremium && !isExpired ? 'Premium' : 'Free'}
                </Text>
                {isPremium && !isExpired ? (
                  <TouchableOpacity onPress={handleCancelSubscription}>
                    <Text style={styles.cancelLink}>cancel</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleUpgradePress}>
                    <Text style={styles.upgradeLink}>upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Progress Section */}
        {!isLoadingProgress && (progress2008?.totalAsked > 0 || progress2025?.totalAsked > 0) && (
          <Card style={styles.card}>
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

            {/* 2025 Test Progress */}
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
          </Card>
        )}

        {/* Current Session Card */}
        <Card style={styles.card}>
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
                  (navigation as any).navigate('Session', {
                    screen: 'ModeSelection',
                  })
                }
                style={styles.resumeButton}
              />
            </>
          )}
        </Card>

        {/* Past Sessions - Always show */}
        <Card style={styles.card}>
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
                    onPress={handleViewPastSessions}
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

        {/* Account Actions */}
        <Card style={styles.card}>
          {/* Legal Links */}
          <View style={styles.legalLinks}>
            <TouchableOpacity
              onPress={() => window.open('https://www.theeclodapps.com/privacy.html', '_blank')}
            >
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDivider}>•</Text>
            <TouchableOpacity
              onPress={() => window.open('https://www.theeclodapps.com/eula.html', '_blank')}
            >
              <Text style={styles.legalLinkText}>End User License Agreement</Text>
            </TouchableOpacity>
          </View>

          {hasActiveSession && (
            <Button
              title="Clear Active Session (Dev)"
              onPress={async () => {
                const confirmed = window.confirm(
                  'Clear Session?\n\nThis will clear your current session data. Use this for testing or if you\'re stuck in a bad state.'
                );
                if (confirmed && currentUser) {
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

                    window.alert('Session cleared successfully');
                  } catch (error) {
                    console.error('Error clearing session:', error);
                    window.alert('Failed to clear session');
                  }
                }
              }}
              variant="secondary"
              style={styles.clearSessionButton}
            />
          )}
          <Button
            title="Delete Account"
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
          />
          <Button
            title="Logout"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </Card>
      </ScrollView>

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradeConfirm}
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
  },
  card: {
    margin: Spacing.md,
    padding: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
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
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
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
  },
  subscriptionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  tierText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  upgradeLink: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
    textDecorationLine: 'underline',
  },
  cancelLink: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    marginLeft: Spacing.xs,
    textDecorationLine: 'underline',
  },
  trophyBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trophyIcon: {
    fontSize: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  sessionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  sessionValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  noSessionText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  resumeButton: {
    marginTop: Spacing.md,
  },
  actionButton: {
    marginTop: Spacing.sm,
  },
  clearSessionButton: {
    marginTop: Spacing.md,
  },
  logoutButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.error,
  },
  deleteButton: {
    marginTop: Spacing.md,
    backgroundColor: '#8b0000', // Dark red
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  legalLinkText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginHorizontal: Spacing.xs,
  },
  errorText: {
    fontSize: FontSizes.base,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.lg,
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
    textTransform: 'uppercase',
  },
  tableCellText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  seeAllLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  seeAllText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
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
