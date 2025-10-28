import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, ModeOptionCard, WelcomeModal, Header } from '../components';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useQuizStore } from '../store/quizStore';
import { TestVersion, QuizMode, Question, StudyMode } from '../types';
import { allQuestions } from '../data/questions';
import { allQuestions2025 } from '../data/questions-2025';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProgressStats, getUser } from '../services/supabase';

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const ModeSelectionScreen = () => {
  const navigation = useNavigation();
  const currentUser = useQuizStore((state) => state.currentUser);
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);
  const setSelectedTestVersion = useQuizStore((state) => state.setSelectedTestVersion);
  const setSelectedMode = useQuizStore((state) => state.setSelectedMode);
  const setStudyMode = useQuizStore((state) => state.setStudyMode);
  const setShuffledQuestions = useQuizStore((state) => state.setShuffledQuestions);
  const setCurrentQuestion = useQuizStore((state) => state.setCurrentQuestion);
  const loadSession = useQuizStore((state) => state.loadSession);
  const resetQuiz = useQuizStore((state) => state.resetQuiz);
  const getQuestionsForSession = useQuizStore((state) => state.getQuestionsForSession);

  const [testVersion, setTestVersion] = useState<TestVersion | null>(null);
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [studyMode, setStudyModeLocal] = useState<StudyMode>('random');
  const [focusedModeAvailable, setFocusedModeAvailable] = useState({
    '2008': false,
    '2025': false
  });

  // Check for new user flag and show welcome modal
  React.useEffect(() => {
    const checkNewUser = async () => {
      const isNewUser = await AsyncStorage.getItem('isNewUser');
      if (isNewUser === 'true') {
        setShowWelcomeModal(true);
        // Clear the flag so it only shows once
        await AsyncStorage.removeItem('isNewUser');
      }
    };
    checkNewUser();
  }, []);

  // Check if focused mode is available for each test version
  React.useEffect(() => {
    const checkFocusedAvailability = async () => {
      if (!currentUser) return;

      try {
        const stats2008 = await getProgressStats(currentUser.username, '2008');
        const stats2025 = await getProgressStats(currentUser.username, '2025');

        setFocusedModeAvailable({
          '2008': stats2008.totalIncorrect > 0,
          '2025': stats2025.totalIncorrect > 0
        });
      } catch (error) {
        console.error('Error checking focused mode availability:', error);
      }
    };

    checkFocusedAvailability();
  }, [currentUser]);

  // Smart default: Auto-select focused if available
  React.useEffect(() => {
    if (testVersion && focusedModeAvailable[testVersion]) {
      setStudyModeLocal('focused');
    }
  }, [testVersion, focusedModeAvailable]);

  // REMOVED: Auto-resume logic
  // Users should explicitly choose to "Resume Session" from the Profile screen
  // or "Start New Quiz" from this screen. Auto-resuming on tab navigation is confusing.

  const handleStartQuiz = async () => {
    // Check if user is logged in
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Please login or create an account to start a quiz.',
        [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login' as never),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    // Check if there's already a session in progress
    if (currentUser.session_status === 'in_progress' && !currentUser.completed) {
      Alert.alert(
        'Session In Progress',
        'You have an active quiz session. Please complete or resume your current session before starting a new one.',
        [
          {
            text: 'Resume Session',
            onPress: async () => {
              // Load session and navigate to quiz
              await loadSession();
              const storeState = useQuizStore.getState();
              if (storeState.currentUser?.test_version) {
                const questions = storeState.currentUser.test_version === '2025' ? allQuestions2025 : allQuestions;

                // Restore shuffled questions from saved indices
                if (storeState.currentUser.shuffled_question_indices &&
                    storeState.currentUser.shuffled_question_indices.length > 0) {
                  const shuffled = storeState.currentUser.shuffled_question_indices.map(index => questions[index]);
                  setShuffledQuestions(shuffled);
                } else {
                  // Fallback: shuffle fresh (for old sessions before this fix)
                  const shuffled = shuffleArray(questions);
                  setShuffledQuestions(shuffled);
                }

                setSelectedTestVersion(storeState.currentUser.test_version);
                setSelectedMode(storeState.currentUser.mode || 'formal');
                setCurrentQuestion(storeState.currentQuestion);
              }
              navigation.navigate('Quiz' as never);
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

    if (!testVersion || !mode) {
      Alert.alert('Selection Required', 'Please select both test version and mode to continue.');
      return;
    }

    // Refresh user data from database to get latest progress for focused mode
    let userForQuestions = currentUser;
    if (studyMode === 'focused') {
      try {
        const freshUser = await getUser(currentUser.username);
        if (freshUser) {
          setCurrentUser(freshUser);
          userForQuestions = freshUser;
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
        // Continue with cached data
      }
    }

    // Reset quiz state for new session (must be done first)
    resetQuiz();

    // Set selections in store
    setSelectedTestVersion(testVersion);
    setSelectedMode(mode);
    setStudyMode(studyMode);

    // Get questions using the store's helper function
    try {
      const shuffled = getQuestionsForSession(
        studyMode,
        testVersion,
        userForQuestions,
        allQuestions,
        allQuestions2025
      );
      setShuffledQuestions(shuffled);
    } catch (error) {
      // Handle "No questions to review" error
      Alert.alert(
        'No Questions to Review',
        'You have answered all questions correctly! Start a random quiz to practice more.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to quiz
    navigation.navigate('Quiz' as never);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.mainTitle}>Start New Quiz Session</Text>

      {/* Test Version Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Test Version</Text>
        <Text style={styles.sectionDescription}>
          Choose based on when you filed Form N-400:
        </Text>

        <ModeOptionCard
          title="2008 Test"
          description="Pass by getting 6 correct (or fail with 5 incorrect) out of up to 10 questions"
          selected={testVersion === '2008'}
          onPress={() => setTestVersion('2008')}
        />

        <ModeOptionCard
          title="2025 Test"
          description="Pass by getting 12 correct (or fail with 9 incorrect) out of up to 20 questions"
          selected={testVersion === '2025'}
          onPress={() => setTestVersion('2025')}
        />
      </View>

      {/* Study Mode Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Study Mode</Text>
        <Text style={styles.sectionDescription}>
          Choose how questions are selected:
        </Text>

        <ModeOptionCard
          title="Random Selection"
          description="Practice with all questions in random order. Prioritizes questions you haven't seen yet."
          selected={studyMode === 'random'}
          onPress={() => setStudyModeLocal('random')}
        />

        <ModeOptionCard
          title="Focused Mode"
          description={
            testVersion && focusedModeAvailable[testVersion]
              ? "Focus on questions you've answered incorrectly or partially correct."
              : "Focus on questions you've answered incorrectly. (No incorrect questions yet)"
          }
          selected={studyMode === 'focused'}
          onPress={() => {
            if (!testVersion) {
              Alert.alert('Select Test Version', 'Please select a test version first.');
              return;
            }
            if (!focusedModeAvailable[testVersion]) {
              Alert.alert(
                'No Questions to Review',
                'You need to answer some questions incorrectly first to use Focused Mode. Try a random quiz!',
                [{ text: 'OK' }]
              );
              return;
            }
            setStudyModeLocal('focused');
          }}
          disabled={testVersion ? !focusedModeAvailable[testVersion] : false}
        />
      </View>

      {/* Mode Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Quiz Mode</Text>
        <Text style={styles.sectionDescription}>
          Choose your preferred interview style:
        </Text>

        <ModeOptionCard
          title="Formal Mode"
          description="Professional USCIS interview simulation. Respectful, formal, and educational. Best for serious study."
          selected={mode === 'formal'}
          onPress={() => setMode('formal')}
        />

        <ModeOptionCard
          title="Comedy Mode (18+)"
          description="Anthony Jeselnik-style roast. Brutal, sarcastic, offensive. Contains profanity and dark humor."
          selected={mode === 'comedy'}
          onPress={() => setMode('comedy')}
        />

        {/* Comedy Warning Box */}
        {mode === 'comedy' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Warning: Adult Content</Text>
              <Text style={styles.warningText}>
                Comedy mode contains offensive language, profanity, and dark humor.
                Not suitable for all audiences.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Start Button */}
      <Button
        title="Start Quiz"
        onPress={handleStartQuiz}
        disabled={!testVersion || !mode}
        style={styles.startButton}
      />

      {/* Help Text */}
      <Text style={styles.helpText}>
        {!currentUser
          ? 'You must be logged in to start a quiz. Login to track your progress.'
          : !testVersion || !mode
          ? 'Select both test version and mode to begin.'
          : 'Ready to start! Tap the button above.'}
      </Text>
    </ScrollView>

    {/* Welcome Modal for new users */}
    <WelcomeModal
      visible={showWelcomeModal}
      onDismiss={() => setShowWelcomeModal(false)}
      isNewUser={true}
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.sm,
    paddingTop: Spacing.md,
  },
  mainTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    lineHeight: 16,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    flexDirection: 'row',
  },
  warningIcon: {
    fontSize: FontSizes.lg,
    marginRight: Spacing.xs,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2,
  },
  warningText: {
    fontSize: FontSizes.xs,
    color: '#856404',
    lineHeight: 16,
  },
  startButton: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  helpText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 14,
  },
});
