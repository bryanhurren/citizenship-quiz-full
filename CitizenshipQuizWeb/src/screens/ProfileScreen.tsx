import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Button, Card, Badge, Header, UpgradeModal } from '../components';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useQuizStore, clearLoggedInUser } from '../store/quizStore';
import { getUser, updateUser } from '../services/supabase';
import { allQuestions } from '../data/questions';
import { allQuestions2025 } from '../data/questions-2025';
import { shuffleArray } from '../utils/shuffle';
import { redirectToCheckout } from '../services/stripe';

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

  // Check if there's an active session (either in DB or in memory)
  const hasActiveSession = currentUser?.session_status === 'in_progress' ||
    (correctCount > 0 || incorrectCount > 0 || currentQuestion > 0);

  // Refresh user data when screen is focused
  useEffect(() => {
    if (isFocused && currentUser) {
      refreshUserData();
    }
  }, [isFocused]);

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

    try {
      await redirectToCheckout({
        userId: parseInt(currentUser.id),
        userEmail: currentUser.username,
      });
    } catch (error) {
      console.error('Error starting checkout:', error);
      window.alert('Failed to start checkout. Please try again.');
    }
  };

  const handleResumeSession = async () => {
    if (!currentUser) {
      console.log('No current user');
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
      console.log('Loading session...');
      // Load session from database
      await loadSession();

      console.log('Session loaded, getting state...');
      // Get fresh values from store after loadSession completes
      const storeState = useQuizStore.getState();
      console.log('Store state:', storeState);

      // Restore shuffled questions from saved indices
      const testVersion = storeState.selectedTestVersion || storeState.currentUser?.test_version || '2008';
      const questions = testVersion === '2025' ? allQuestions2025 : allQuestions;

      console.log('Test version:', testVersion, 'Question count:', questions.length);

      // If we have saved shuffle indices, use them to restore the exact order
      if (storeState.currentUser?.shuffled_question_indices &&
          storeState.currentUser.shuffled_question_indices.length > 0) {
        console.log('Restoring shuffled questions from indices');

        // Filter out invalid indices (bounds checking)
        const validIndices = storeState.currentUser.shuffled_question_indices.filter(
          (index: number) => index >= 0 && index < questions.length
        );

        if (validIndices.length > 0) {
          const shuffled = validIndices.map((index: number) => questions[index]);
          setShuffledQuestions(shuffled);
        } else {
          // If no valid indices, create fresh shuffle
          console.log('No valid indices, creating fresh shuffle');
          const shuffled = shuffleArray(questions);
          setShuffledQuestions(shuffled);
        }
      } else {
        // Fallback: shuffle fresh (for old sessions before this fix)
        console.log('No shuffle indices, creating fresh shuffle');
        const shuffled = shuffleArray(questions);
        setShuffledQuestions(shuffled);
      }

      console.log('Navigating to Quiz screen...');
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
                {(!isPremium || isExpired) && (
                  <TouchableOpacity onPress={handleUpgradePress}>
                    <Text style={styles.upgradeLink}>upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Card>

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

        {/* Actions */}
        <Card style={styles.card}>
          <Button
            title="View Past Sessions"
            onPress={handleViewPastSessions}
            style={styles.actionButton}
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
  logoutButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.error,
  },
  errorText: {
    fontSize: FontSizes.base,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
