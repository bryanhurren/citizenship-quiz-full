import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Badge, TypingIndicator, UpgradeModal, SignUpPrompt } from '../components';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useQuizStore } from '../store/quizStore';
import { incrementGuestQuestionCount, getGuestQuestionCount } from '../services/guestMode';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { evaluateAnswer } from '../services/api';
import {
  saveSession as saveSessionToDb,
  updateUser as updateUserInDb,
  getUser,
  createUser,
  updateQuestionProgress,
  getProgressStats,
} from '../services/supabase';
import { AnswerGrade, ChatMessage, QuestionResult, Question } from '../types';
import { storeLoggedInUser } from '../store/quizStore';
import { setHasCreatedAccount } from '../services/guestMode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync, scheduleDailyReminder } from '../services/notifications';
import { Ionicons } from '@expo/vector-icons';
import {
  getOfferings,
  purchasePackage,
} from '../services/purchases';
import { allQuestions } from '../data/questions';
import { allQuestions2025 } from '../data/questions-2025';

export const QuizScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Zustand store
  const currentUser = useQuizStore((state) => state.currentUser);
  const selectedMode = useQuizStore((state) => state.selectedMode);
  const selectedTestVersion = useQuizStore((state) => state.selectedTestVersion);
  const studyMode = useQuizStore((state) => state.studyMode);
  const shuffledQuestions = useQuizStore((state) => state.shuffledQuestions);
  const currentQuestion = useQuizStore((state) => state.currentQuestion);
  const correctCount = useQuizStore((state) => state.correctCount);
  const incorrectCount = useQuizStore((state) => state.incorrectCount);

  const setCurrentQuestion = useQuizStore((state) => state.setCurrentQuestion);
  const incrementCorrect = useQuizStore((state) => state.incrementCorrect);
  const incrementIncorrect = useQuizStore((state) => state.incrementIncorrect);
  const addQuestionResult = useQuizStore((state) => state.addQuestionResult);
  const updateLastQuestionResult = useQuizStore((state) => state.updateLastQuestionResult);
  const saveSession = useQuizStore((state) => state.saveSession);
  const updateUser = useQuizStore((state) => state.updateUser);
  const checkDailyLimit = useQuizStore((state) => state.checkDailyLimit);
  const canUserAnswer = useQuizStore((state) => state.canUserAnswer);
  const incrementQuestionCount = useQuizStore((state) => state.incrementQuestionCount);
  const setCurrentUser = useQuizStore((state) => state.setCurrentUser);
  const isGuest = useQuizStore((state) => state.isGuest);

  // Local state for chat interface
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isNewUserUpgrade, setIsNewUserUpgrade] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [isPartialRetry, setIsPartialRetry] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<AnswerGrade | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Quiz configuration based on test version
  const totalQuestionsToAsk = selectedTestVersion === '2025' ? 20 : 10;
  const passThreshold = selectedTestVersion === '2025' ? 12 : 6;
  const failThreshold = selectedTestVersion === '2025' ? 9 : 5;

  // Calculate total questions asked from store (persists across re-renders)
  const totalQuestionsAsked = correctCount + incorrectCount;

  // Get current question
  const question = shuffledQuestions[currentQuestion];

  // Helper to get original question index from source array
  const getQuestionIndex = (question: Question): number => {
    const sourceQuestions = selectedTestVersion === '2025' ? allQuestions2025 : allQuestions;
    return sourceQuestions.findIndex(q => q.q === question.q);
  };

  // Check if user is logged in
  useEffect(() => {
    if (isFocused && !currentUser) {
      navigation.navigate('Login' as never);
    }
  }, [isFocused, currentUser, navigation]);

  // Check daily limit
  useEffect(() => {
    if (isFocused && currentUser) {
      checkDailyLimit();
    }
  }, [isFocused, currentUser]);

  // Check if no questions loaded (but not if session just completed)
  useEffect(() => {
    if (isFocused && shuffledQuestions.length === 0 && !sessionCompleted) {
      Alert.alert('No Questions', 'Please start a new session from Mode Selection.', [
        { text: 'OK', onPress: () => navigation.navigate('ModeSelection' as never) },
      ]);
    }
  }, [isFocused, shuffledQuestions, navigation, sessionCompleted]);

  // Initialize chat with welcome message and first question
  useEffect(() => {
    if (isFocused && question && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'welcome',
        content: 'Welcome to your AI Citizenship Test.',
        timestamp: new Date(),
      };
      const questionMessage: ChatMessage = {
        id: `question-${currentQuestion}`,
        type: 'question',
        content: question.q,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage, questionMessage]);
    }
  }, [isFocused, question, currentQuestion]);

  // Auto-scroll to bottom when messages change - without dismissing keyboard
  useEffect(() => {
    // Use InteractionManager to defer scroll until after animations/interactions complete
    // This prevents the scroll from interfering with keyboard focus
    const scrollTimer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);

    return () => clearTimeout(scrollTimer);
  }, [messages]);

  // Initial focus only - don't fight keyboard state changes
  useEffect(() => {
    if (isFocused && !sessionCompleted) {
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(focusTimer);
    }
  }, [isFocused]);

  // Handle Apple Sign-In from guest prompt
  const handleAppleSignInFromPrompt = async () => {
    setShowSignUpPrompt(false);
    setIsLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const email = credential.email || `${credential.user}@privaterelay.appleid.com`;
      const name = credential.fullName?.givenName || 'User';

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // Existing user - log them in
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
        Alert.alert('Welcome Back!', 'You have been signed in successfully.');
      } else {
        // New user - create account
        const newUser = await createUser({
          username: email,
          password: '',
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
          setCurrentUser(newUser);

          // Request notification permissions
          try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
              await scheduleDailyReminder('09:00');
            }
          } catch (error) {
            console.error('Error requesting notification permissions:', error);
          }

          // Show premium upsell for new users
          setIsNewUserUpgrade(true);
          setShowUpgradeModal(true);
        }
      }
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Sign In Error', 'Failed to sign in with Apple. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In from guest prompt
  const handleGoogleSignInFromPrompt = async () => {
    setShowSignUpPrompt(false);
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

      // Check if user already exists
      const existingUser = await getUser(email);

      if (existingUser) {
        // Existing user - log them in
        if (photo && existingUser.profile_picture !== photo) {
          await updateUserInDb(existingUser.username, { profile_picture: photo });
          existingUser.profile_picture = photo;
        }
        await storeLoggedInUser(email);
        setCurrentUser(existingUser);
        Alert.alert('Welcome Back!', 'You have been signed in successfully.');
      } else {
        // New user - create account
        const newUser = await createUser({
          username: email,
          password: '',
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
          profile_picture: photo,
        });

        if (newUser) {
          await storeLoggedInUser(email);
          await setHasCreatedAccount();
          setCurrentUser(newUser);

          // Request notification permissions
          try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
              await scheduleDailyReminder('09:00');
            }
          } catch (error) {
            console.error('Error requesting notification permissions:', error);
          }

          // Show premium upsell for new users
          setIsNewUserUpgrade(true);
          setShowUpgradeModal(true);
        }
      }
    } catch (error: any) {
      if (error.code !== '-5' && error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Sign In Error', error.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check for pass/fail conditions - returns status if session should end
  const checkSessionStatus = () => {
    // FOCUSED MODE: Session complete when all questions answered
    if (studyMode === 'focused') {
      if (totalQuestionsAsked >= shuffledQuestions.length) {
        return 'passed'; // Focused mode always "passes" (just practice)
      }
      return null; // Session continues
    }

    // RANDOM MODE: Standard pass/fail logic
    // Early PASS - reached pass threshold
    if (correctCount >= passThreshold) {
      return 'passed';
    }
    // Early FAIL - reached fail threshold
    if (incorrectCount >= failThreshold) {
      return 'failed';
    }
    // Completed all questions - evaluate final result
    if (totalQuestionsAsked >= totalQuestionsToAsk) {
      return correctCount >= passThreshold ? 'passed' : 'failed';
    }
    return null; // Session continues
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      Alert.alert('Empty Answer', 'Please enter an answer before submitting.');
      return;
    }

    if (!selectedMode || !question) {
      Alert.alert('Error', 'Quiz configuration error. Please restart.');
      return;
    }

    // Check guest daily limit STRICTLY (only on first answer, not retry)
    if (!isPartialRetry && isGuest()) {
      const { canAnswer } = await getGuestQuestionCount();
      if (!canAnswer) {
        // Guest has reached daily limit - show sign up prompt and prevent submission
        setShowSignUpPrompt(true);
        return;
      }
    }

    // Check daily limit for free users (only on first answer, not retry)
    if (!isPartialRetry && !canUserAnswer()) {
      Alert.alert(
        'Daily Limit Reached',
        'You have reached your daily limit of 5 questions. Upgrade to Premium for unlimited access at $0.99/week.',
        [
          {
            text: 'Upgrade to Premium',
            onPress: () => {
              setIsNewUserUpgrade(false);
              setShowUpgradeModal(true);
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    setIsLoading(true);

    try {
      // Add user answer message to chat
      const userMessage: ChatMessage = {
        id: `answer-${currentQuestion}-${Date.now()}`,
        type: 'user_answer',
        content: userAnswer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Call AI evaluation API
      const evaluation = await evaluateAnswer(
        question.q,
        question.a,
        userAnswer,
        selectedMode
      );

      if (!evaluation) {
        Alert.alert('Error', 'Failed to evaluate answer. Please try again.');
        setIsLoading(false);
        return;
      }

      // Debug logging
      console.log('Evaluation object:', evaluation);
      console.log('Evaluation feedback type:', typeof evaluation.feedback);
      console.log('Evaluation feedback value:', evaluation.feedback);

      // Add feedback message to chat
      const feedbackMessage: ChatMessage = {
        id: `feedback-${currentQuestion}-${Date.now()}`,
        type: 'feedback',
        content: typeof evaluation.feedback === 'string'
          ? evaluation.feedback
          : JSON.stringify(evaluation.feedback),
        grade: evaluation.grade,
        correctAnswer: question.a,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, feedbackMessage]);
      setCurrentGrade(evaluation.grade);

      // Handle grading logic
      if (isPartialRetry) {
        // This is the second attempt on a partial answer
        if (evaluation.grade === 'correct') {
          incrementCorrect();
          updateLastQuestionResult({
            userAnswer,
            grade: 'correct',
            feedback: evaluation.feedback,
          });

          // Update question progress in database
          if (currentUser && currentUser !== 'guest' && question && selectedTestVersion) {
            try {
              const questionIndex = getQuestionIndex(question);
              if (questionIndex !== -1) {
                await updateQuestionProgress(
                  currentUser.username,
                  questionIndex,
                  'correct',
                  selectedTestVersion
                );
              }
            } catch (error) {
              console.error('Error updating question progress:', error);
              // Don't block UI - progress tracking is non-critical
            }
          }
        } else {
          incrementIncorrect();
          updateLastQuestionResult({
            userAnswer,
            grade: 'incorrect',
            feedback: evaluation.feedback,
          });

          // Update question progress in database
          if (currentUser && currentUser !== 'guest' && question && selectedTestVersion) {
            try {
              const questionIndex = getQuestionIndex(question);
              if (questionIndex !== -1) {
                await updateQuestionProgress(
                  currentUser.username,
                  questionIndex,
                  'incorrect',
                  selectedTestVersion
                );
              }
            } catch (error) {
              console.error('Error updating question progress:', error);
              // Don't block UI - progress tracking is non-critical
            }
          }
        }
        setIsPartialRetry(false);
        // totalQuestionsAsked will auto-update from correctCount + incorrectCount
      } else {
        // First attempt
        addQuestionResult({
          question: question.q,
          userAnswer,
          correctAnswer: question.a,
          grade: evaluation.grade,
          feedback: evaluation.feedback,
        });

        if (evaluation.grade === 'correct') {
          incrementCorrect();
          // totalQuestionsAsked will auto-update from correctCount + incorrectCount

          // Update question progress in database
          if (currentUser && currentUser !== 'guest' && question && selectedTestVersion) {
            try {
              const questionIndex = getQuestionIndex(question);
              if (questionIndex !== -1) {
                await updateQuestionProgress(
                  currentUser.username,
                  questionIndex,
                  'correct',
                  selectedTestVersion
                );
              }
            } catch (error) {
              console.error('Error updating question progress:', error);
              // Don't block UI - progress tracking is non-critical
            }
          }
        } else if (evaluation.grade === 'partial') {
          // Don't increment question count yet - wait for retry
          // Don't increment correct/incorrect yet either
        } else {
          incrementIncorrect();
          // totalQuestionsAsked will auto-update from correctCount + incorrectCount

          // Update question progress in database
          if (currentUser && currentUser !== 'guest' && question && selectedTestVersion) {
            try {
              const questionIndex = getQuestionIndex(question);
              if (questionIndex !== -1) {
                await updateQuestionProgress(
                  currentUser.username,
                  questionIndex,
                  'incorrect',
                  selectedTestVersion
                );
              }
            } catch (error) {
              console.error('Error updating question progress:', error);
              // Don't block UI - progress tracking is non-critical
            }
          }
        }

        // Increment daily question count (for logged-in users)
        if (!isGuest()) {
          await incrementQuestionCount();
        } else {
          // Guest mode - increment guest question count
          const { count, reachedLimit } = await incrementGuestQuestionCount();

          // Show sign-up prompt when guest reaches limit (but allow them to continue)
          if (reachedLimit) {
            setShowSignUpPrompt(true);
          }
        }
      }

      // Save session after each answer
      await saveSession();

      // Check if user can retry (only for partial answers on first attempt)
      if (evaluation.grade === 'partial' && !isPartialRetry) {
        // User can retry - set flag and clear input
        setIsPartialRetry(true);
        setUserAnswer('');
        // Focus will be maintained by the useEffect
      } else {
        // Move to waiting for next state
        setWaitingForNext(true);
        setUserAnswer('');
        // Focus will be maintained by the useEffect

        // Check for session completion
        const status = checkSessionStatus();
        if (status) {
          await handleSessionComplete(status);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    // Check if this is the end of the quiz
    const status = checkSessionStatus();
    if (status) {
      await handleSessionComplete(status);
      return;
    }

    // Move to next question
    const nextQuestionIndex = currentQuestion + 1;
    setCurrentQuestion(nextQuestionIndex);

    // Add next question message to chat
    const nextQuestion = shuffledQuestions[nextQuestionIndex];
    if (nextQuestion) {
      const questionMessage: ChatMessage = {
        id: `question-${nextQuestionIndex}`,
        type: 'question',
        content: nextQuestion.q,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, questionMessage]);
    }

    setWaitingForNext(false);
    setCurrentGrade(null);

    // Save session
    await saveSession();
  };

  const handleSessionComplete = async (status: 'passed' | 'failed') => {
    setSessionCompleted(true);

    // Check if this is a focused mode session FIRST (before creating messages)
    if (studyMode === 'focused' && currentUser && currentUser !== 'guest' && selectedTestVersion) {
      // Create brief completion message for focused mode
      const completionMessage: ChatMessage = {
        id: 'completion',
        type: 'feedback',
        content: `Focused practice complete! You answered ${correctCount} correctly and ${incorrectCount} incorrectly.`,
        grade: 'correct',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, completionMessage]);
      // Save session to database before navigating
      const sessionData = {
        user_id: currentUser.id,
        test_version: selectedTestVersion,
        mode: selectedMode || 'formal',
        study_mode: studyMode, // Save study mode (focused/random)
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        total_questions_asked: totalQuestionsAsked,
        session_status: status,
        completed_at: new Date().toISOString(),
        question_results: useQuizStore.getState().questionResults,
      };

      console.log('Saving focused mode session to database:', sessionData);
      const savedSession = await saveSessionToDb(sessionData);
      if (savedSession) {
        console.log('Focused mode session saved successfully:', savedSession.id);
      } else {
        console.error('Failed to save focused mode session to database');
      }

      // Update user record - clear session_status
      await updateUser({
        session_status: null, // Clear session status
        best_score: Math.max(currentUser.best_score || 0, correctCount),
        last_session_date: new Date().toISOString(),
        completed: true,
        current_question: 0,
        correct_count: 0,
        partial_count: 0,
        incorrect_count: 0,
        question_results: [],
      });

      // Reset in-memory quiz state
      useQuizStore.getState().resetQuiz();

      // Navigate to focused mode complete screen
      console.log('Navigating to FocusedModeComplete with params:', {
        previousIncorrect: shuffledQuestions.length,
        nowCorrect: correctCount,
        stillIncorrect: incorrectCount,
        previousAccuracy: 0,
        newAccuracy: correctCount > 0 ? (correctCount / (correctCount + incorrectCount)) * 100 : 0,
        testVersion: selectedTestVersion,
      });

      navigation.navigate('FocusedModeComplete' as never, {
        previousIncorrect: shuffledQuestions.length,
        nowCorrect: correctCount,
        stillIncorrect: incorrectCount,
        previousAccuracy: 0,
        newAccuracy: correctCount > 0 ? (correctCount / (correctCount + incorrectCount)) * 100 : 0,
        testVersion: selectedTestVersion,
      } as never);
      return;
    }

    // Get incorrect questions for summary
    const incorrectQuestions = useQuizStore.getState().questionResults.filter(
      (r) => r.grade === 'incorrect'
    );

    // Create summary message
    const summaryText = `
🎯 Quiz Complete: ${status.toUpperCase()}

📊 Final Score: ${correctCount}/${totalQuestionsAsked}
✅ Correct: ${correctCount}
❌ Incorrect: ${incorrectCount}

${incorrectQuestions.length > 0 ? `\n📝 Questions to Review:\n${incorrectQuestions.map((q, i) => `\n${i + 1}. ${q.question}\nYour answer: "${q.userAnswer}"\nCorrect answer: "${q.correctAnswer}"\n`).join('')}` : ''}
`.trim();

    const summaryMessage: ChatMessage = {
      id: 'summary',
      type: 'feedback',
      content: summaryText,
      grade: status === 'passed' ? 'correct' : 'incorrect',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, summaryMessage]);

    // Save session to database (skip for guests)
    if (currentUser && currentUser !== 'guest' && selectedTestVersion && selectedMode) {
      const sessionData = {
        user_id: currentUser.id,
        test_version: selectedTestVersion,
        mode: selectedMode,
        study_mode: studyMode || 'random', // Save study mode (focused/random)
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        total_questions_asked: totalQuestionsAsked,
        session_status: status,
        completed_at: new Date().toISOString(),
        question_results: useQuizStore.getState().questionResults,
      };

      console.log('Saving session to database:', sessionData);
      const savedSession = await saveSessionToDb(sessionData);
      if (savedSession) {
        console.log('Session saved successfully:', savedSession.id);
      } else {
        console.error('Failed to save session to database');
      }

      // Update user record - clear session_status and update best score
      const bestScore = Math.max(currentUser.best_score || 0, correctCount);
      await updateUser({
        session_status: null, // Clear session status
        best_score: bestScore,
        last_session_date: new Date().toISOString(),
        completed: true,
        current_question: 0,
        correct_count: 0,
        partial_count: 0,
        incorrect_count: 0,
        question_results: [],
      });
    }

    // Reset in-memory quiz state
    useQuizStore.getState().resetQuiz();
  };

  const handleUpgradeConfirm = async () => {
    if (!currentUser || currentUser === 'guest') {
      Alert.alert('Error', 'You must be logged in to upgrade. Please create an account first.');
      setShowUpgradeModal(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch available offerings
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

      // Find the weekly package
      const weeklyPackage = offerings.availablePackages.find(
        pkg => pkg.product.identifier === 'weekly_premium_subscription'
      ) || offerings.availablePackages[0];

      if (!weeklyPackage) {
        Alert.alert('Error', 'No subscription packages available.');
        setShowUpgradeModal(false);
        setIsLoading(false);
        return;
      }

      // Make the purchase
      const { customerInfo, error } = await purchasePackage(weeklyPackage);

      if (error || !customerInfo) {
        Alert.alert('Purchase Failed', error?.message || 'Unable to complete purchase. Please try again.');
        setShowUpgradeModal(false);
        setIsLoading(false);
        return;
      }

      // Check if user is now premium
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      const isPremium = premiumEntitlement !== undefined;

      if (isPremium && premiumEntitlement) {
        // Get expiration date from entitlement
        // Default to +7 days if RevenueCat doesn't provide one
        let expiresAt: string;

        if (premiumEntitlement.expirationDate) {
          expiresAt = new Date(premiumEntitlement.expirationDate).toISOString();
        } else {
          // Fallback: Set expiration to 7 days from now
          const defaultExpiration = new Date();
          defaultExpiration.setDate(defaultExpiration.getDate() + 7);
          expiresAt = defaultExpiration.toISOString();
        }

        // Update user in database
        await updateUserInDb(currentUser.username, {
          subscription_tier: 'premium',
          subscription_expires_at: expiresAt,
        });

        // Update local state with both tier and expiration
        setCurrentUser({
          ...currentUser,
          subscription_tier: 'premium',
          subscription_expires_at: expiresAt,
        });

        Alert.alert('Success!', 'You now have unlimited access to all questions!');
        setShowUpgradeModal(false);
      } else {
        Alert.alert('Error', 'Purchase completed but premium access was not activated. Please contact support.');
        setShowUpgradeModal(false);
      }
    } catch (error: any) {
      console.error('Purchase error:', error);

      if (error.code === 'PURCHASES_CANCELLED_ERROR') {
        // User cancelled - just close modal
        setShowUpgradeModal(false);
      } else {
        Alert.alert('Purchase Failed', error.message || 'Please try again.');
        setShowUpgradeModal(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render a single chat message
  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'welcome') {
      return (
        <View key={message.id} style={styles.welcomeMessageContainer}>
          <Text style={styles.welcomeMessage}>{message.content}</Text>
        </View>
      );
    }

    if (message.type === 'question') {
      return (
        <View key={message.id} style={[styles.messageContainer, styles.questionContainer]}>
          <View style={styles.messageBubble}>
            <Text style={styles.questionText}>{message.content}</Text>
          </View>
        </View>
      );
    }

    if (message.type === 'user_answer') {
      return (
        <View key={message.id} style={[styles.messageContainer, styles.userMessageContainer]}>
          <View style={[styles.messageBubble, styles.userMessageBubble]}>
            <Text style={styles.userMessageText}>{message.content}</Text>
          </View>
        </View>
      );
    }

    if (message.type === 'feedback') {
      const backgroundColor =
        message.grade === 'correct'
          ? Colors.correct
          : message.grade === 'partial'
          ? Colors.partial
          : Colors.incorrect;

      return (
        <View key={message.id} style={[styles.messageContainer, styles.feedbackContainer]}>
          <View style={[styles.messageBubble, { backgroundColor }]}>
            <View style={styles.feedbackHeader}>
              <Badge
                text={message.grade?.toUpperCase() || ''}
                variant={
                  message.grade === 'correct'
                    ? 'primary'
                    : message.grade === 'partial'
                    ? 'comedy'
                    : 'formal'
                }
              />
            </View>
            <Text style={styles.feedbackText}>{message.content}</Text>
            {message.correctAnswer && (
              <>
                <Text style={styles.correctAnswerLabel}>Correct Answer:</Text>
                <Text style={styles.correctAnswerText}>{message.correctAnswer}</Text>
              </>
            )}
          </View>
        </View>
      );
    }

    return null;
  };

  const handleButtonPress = () => {
    if (waitingForNext) {
      handleNextQuestion();
    } else {
      handleSubmitAnswer();
    }
  };

  if (!question && !sessionCompleted) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Compact Header - No Partial Counter */}
        <View style={styles.header}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.correct }]}>{correctCount}</Text>
              <Text style={styles.statLabel}>✓</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.incorrect }]}>{incorrectCount}</Text>
              <Text style={styles.statLabel}>✗</Text>
            </View>
          </View>
        </View>

        {/* Chat Messages - ScrollView only (no input inside) */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={[styles.messageContainer, styles.questionContainer]}>
              <View style={[styles.messageBubble, styles.typingBubble]}>
                <TypingIndicator />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Retry hint for partial answers */}
        {currentGrade === 'partial' && isPartialRetry && !waitingForNext && (
          <View style={styles.retryHintContainer}>
            <Text style={styles.retryHint}>
              Your answer was partially correct. You may retry to improve your answer.
            </Text>
          </View>
        )}

        {/* Input Area / Completion Button - Fixed at bottom, above keyboard */}
        {sessionCompleted ? (
          <View style={styles.completionContainer}>
            <TouchableOpacity
              style={styles.viewResultsButton}
              onPress={() => navigation.navigate('ModeSelection' as never)}
            >
              <Text style={styles.viewResultsButtonText}>Start New Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={userAnswer}
              onChangeText={setUserAnswer}
              placeholder={waitingForNext ? 'Tap arrow for next question...' : 'Type your answer...'}
              multiline
              editable={!isLoading}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!userAnswer.trim() && !waitingForNext) || isLoading ? styles.sendButtonDisabled : null,
              ]}
              onPress={handleButtonPress}
              disabled={(!userAnswer.trim() && !waitingForNext) || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color={!userAnswer.trim() && !waitingForNext ? Colors.textMuted : Colors.white}
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Upgrade Modal */}
        <UpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={handleUpgradeConfirm}
          title={isNewUserUpgrade ? 'Get unlimited questions for just $0.99 per week!' : 'Upgrade to Premium'}
        />

        {/* Sign Up Prompt for Guests */}
        <SignUpPrompt
          visible={showSignUpPrompt}
          onDismiss={() => setShowSignUpPrompt(false)}
          onAppleSignIn={handleAppleSignInFromPrompt}
          onGoogleSignIn={handleGoogleSignInFromPrompt}
        />
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
  loadingText: {
    fontSize: FontSizes.lg,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  header: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSizes.base,
    color: Colors.textLight,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: Spacing.md,
  },
  welcomeMessageContainer: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  welcomeMessage: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: Spacing.md,
    maxWidth: '80%',
  },
  questionContainer: {
    alignSelf: 'flex-start',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  feedbackContainer: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
  },
  userMessageBubble: {
    backgroundColor: Colors.primary,
  },
  typingBubble: {
    backgroundColor: '#22c55e', // Green bubble for typing indicator
  },
  questionText: {
    fontSize: FontSizes.base,
    color: Colors.text,
    lineHeight: 22,
  },
  userMessageText: {
    fontSize: FontSizes.base,
    color: Colors.white,
    lineHeight: 22,
  },
  feedbackHeader: {
    marginBottom: Spacing.sm,
  },
  feedbackText: {
    fontSize: FontSizes.base,
    color: Colors.white,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  correctAnswerLabel: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    opacity: 0.9,
  },
  correctAnswerText: {
    fontSize: FontSizes.base,
    color: Colors.white,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.base,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.background,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  retryHintContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  retryHint: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  completionContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  viewResultsButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  viewResultsButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
