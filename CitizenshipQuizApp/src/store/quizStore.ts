import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, QuizState, User, QuestionResult, QuizMode, TestVersion, StudyMode } from '../types';
import { getUser, updateUser, checkAndResetDailyLimit, canAnswerQuestion, incrementQuestionsAnswered } from '../services/supabase';

interface QuizStore extends QuizState {
  // Actions
  setCurrentUser: (user: User | 'guest' | null) => void;
  setGuestMode: () => void;
  isGuest: () => boolean;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setSelectedMode: (mode: QuizMode) => void;
  setSelectedTestVersion: (version: TestVersion) => void;
  setStudyMode: (mode: StudyMode) => void;
  setShuffledQuestions: (questions: Question[]) => void;
  setCurrentQuestion: (questionIndex: number) => void;
  addQuestionResult: (result: QuestionResult) => void;
  updateLastQuestionResult: (updates: Partial<QuestionResult>) => void;
  incrementCorrect: () => void;
  incrementPartial: () => void;
  incrementIncorrect: () => void;
  decrementCorrect: () => void;
  decrementPartial: () => void;
  decrementIncorrect: () => void;
  setHasAnswered: (value: boolean) => void;
  setHasRetried: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  resetQuiz: () => void;
  loadSession: () => Promise<void>;
  restoreSessionQuestions: (
    allQuestions2008: Question[],
    allQuestions2025: Question[]
  ) => Promise<{ success: boolean; questions: Question[]; error?: string }>;
  saveSession: () => Promise<void>;
  completeQuiz: () => Promise<void>;
  // Premium tier functions
  checkDailyLimit: () => Promise<void>;
  canUserAnswer: () => boolean;
  incrementQuestionCount: () => Promise<void>;
  // Helper functions
  getQuestionsForSession: (
    studyMode: StudyMode,
    testVersion: TestVersion,
    user: User,
    allQuestions2008: Question[],
    allQuestions2025: Question[]
  ) => Question[];
}

const initialState: QuizState = {
  currentUser: null,
  selectedMode: null,
  selectedTestVersion: null,
  studyMode: null,
  currentQuestion: 0,
  correctCount: 0,
  partialCount: 0,
  incorrectCount: 0,
  questionResults: [],
  shuffledQuestions: [],
  hasAnswered: false,
  hasRetried: false,
  isLoading: false,
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  ...initialState,

  setCurrentUser: (user) => set({ currentUser: user }),

  setGuestMode: () => set({ currentUser: 'guest' }),

  isGuest: () => {
    const { currentUser } = get();
    return currentUser === 'guest';
  },

  updateUser: async (updates) => {
    const { currentUser } = get();
    if (!currentUser || currentUser === 'guest') return;

    try {
      const updatedUser = await updateUser(currentUser.username, updates);
      if (updatedUser) {
        set({ currentUser: updatedUser });
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  },

  setSelectedMode: (mode) => set({ selectedMode: mode }),

  setSelectedTestVersion: (version) => set({ selectedTestVersion: version }),

  setStudyMode: (mode) => set({ studyMode: mode }),

  setShuffledQuestions: (questions) => set({ shuffledQuestions: questions }),

  setCurrentQuestion: (questionIndex) => set({ currentQuestion: questionIndex }),

  addQuestionResult: (result) =>
    set((state) => ({
      questionResults: [...state.questionResults, result],
    })),

  updateLastQuestionResult: (updates) =>
    set((state) => {
      const results = [...state.questionResults];
      if (results.length > 0) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          ...updates,
        };
      }
      return { questionResults: results };
    }),

  incrementCorrect: () => set((state) => ({ correctCount: state.correctCount + 1 })),

  incrementPartial: () => set((state) => ({ partialCount: state.partialCount + 1 })),

  incrementIncorrect: () => set((state) => ({ incorrectCount: state.incorrectCount + 1 })),

  decrementCorrect: () => set((state) => ({ correctCount: Math.max(0, state.correctCount - 1) })),

  decrementPartial: () => set((state) => ({ partialCount: Math.max(0, state.partialCount - 1) })),

  decrementIncorrect: () => set((state) => ({ incorrectCount: Math.max(0, state.incorrectCount - 1) })),

  setHasAnswered: (value) => set({ hasAnswered: value }),

  setHasRetried: (value) => set({ hasRetried: value }),

  setIsLoading: (value) => set({ isLoading: value }),

  resetQuiz: () =>
    set({
      selectedMode: null,
      selectedTestVersion: null,
      studyMode: null,
      currentQuestion: 0,
      correctCount: 0,
      partialCount: 0,
      incorrectCount: 0,
      questionResults: [],
      shuffledQuestions: [],
      hasAnswered: false,
      hasRetried: false,
    }),

  loadSession: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      const user = await getUser(currentUser.username);
      if (user) {
        set({
          currentUser: user,
          currentQuestion: user.current_question || 0,
          correctCount: user.correct_count || 0,
          partialCount: user.partial_count || 0,
          incorrectCount: user.incorrect_count || 0,
          questionResults: user.question_results || [],
          selectedMode: user.mode || 'formal',
          selectedTestVersion: user.test_version || '2008',
          studyMode: user.study_mode || 'random',
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  },

  /**
   * Centralized session restoration logic
   * Handles all edge cases: old sessions, focused mode, missing data
   * Returns { success: boolean, questions: Question[], error?: string }
   */
  restoreSessionQuestions: async (
    allQuestions2008: Question[],
    allQuestions2025: Question[]
  ): Promise<{ success: boolean; questions: Question[]; error?: string }> => {
    const { currentUser } = get();

    if (!currentUser || currentUser === 'guest') {
      return { success: false, questions: [], error: 'Not logged in' };
    }

    try {
      // Step 1: Refresh user data from database
      const freshUser = await getUser(currentUser.username);
      if (!freshUser) {
        return { success: false, questions: [], error: 'User not found' };
      }

      // Update store with fresh data
      set({ currentUser: freshUser });

      const testVersion = freshUser.test_version || '2008';
      const studyMode = freshUser.study_mode || 'random';
      const questions = testVersion === '2025' ? allQuestions2025 : allQuestions2008;

      // Step 2: Try to restore from saved indices (preferred method)
      if (freshUser.shuffled_question_indices && freshUser.shuffled_question_indices.length > 0) {
        const restoredQuestions = freshUser.shuffled_question_indices
          .map(idx => questions[idx])
          .filter(q => q !== undefined); // Filter out any invalid indices

        if (restoredQuestions.length > 0) {
          return { success: true, questions: restoredQuestions };
        }
      }

      // Step 3: Fallback - regenerate questions based on study mode
      const getQuestions = get().getQuestionsForSession;

      try {
        const regenerated = getQuestions(
          studyMode,
          testVersion,
          freshUser,
          allQuestions2008,
          allQuestions2025
        );
        return { success: true, questions: regenerated };
      } catch (focusedError) {
        // Step 4: If focused mode fails (no incorrect questions), offer graceful fallback
        if (studyMode === 'focused') {
          // Try random mode instead
          try {
            const randomQuestions = getQuestions(
              'random',
              testVersion,
              freshUser,
              allQuestions2008,
              allQuestions2025
            );
            return {
              success: true,
              questions: randomQuestions,
              error: 'No incorrect questions found. Switched to random mode.'
            };
          } catch (randomError) {
            // Last resort: just shuffle all questions
            const shuffled = [...questions];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return { success: true, questions: shuffled };
          }
        }
        throw focusedError;
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      return {
        success: false,
        questions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  saveSession: async () => {
    const state = get();
    if (!state.currentUser || state.currentUser === 'guest') return;

    try {
      // Convert shuffled questions to indices for storage
      // We'll store indices pointing to the original question set
      const shuffledIndices = state.shuffledQuestions.map(q => {
        // Find the index of this question in the original allQuestions or allQuestions2025
        const { allQuestions } = require('../data/questions');
        const { allQuestions2025 } = require('../data/questions-2025');
        const sourceQuestions = state.selectedTestVersion === '2025' ? allQuestions2025 : allQuestions;
        return sourceQuestions.findIndex(sq => sq.q === q.q && sq.a === q.a);
      });

      const updates: Partial<User> = {
        current_question: state.currentQuestion,
        correct_count: state.correctCount,
        partial_count: state.partialCount,
        incorrect_count: state.incorrectCount,
        question_results: state.questionResults,
        last_session_date: new Date().toISOString(),
        mode: state.selectedMode || 'formal',
        test_version: state.selectedTestVersion || '2008',
        session_status: 'in_progress', // Always set to in_progress when saving
        shuffled_question_indices: shuffledIndices, // Save the shuffled order
      };

      const updatedUser = await updateUser(state.currentUser.username, updates);
      if (updatedUser) {
        set({ currentUser: updatedUser });
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  },

  completeQuiz: async () => {
    const state = get();
    if (!state.currentUser || state.currentUser === 'guest') return;

    try {
      // Calculate best score
      let bestScore = state.currentUser.best_score || 0;
      if (state.correctCount > bestScore) {
        bestScore = state.correctCount;
      }

      const updates: Partial<User> = {
        completed: true,
        best_score: bestScore,
        last_session_date: new Date().toISOString(),
        session_status: null, // Clear session status when quiz is completed
      };

      const updatedUser = await updateUser(state.currentUser.username, updates);
      if (updatedUser) {
        set({ currentUser: updatedUser });
      }
    } catch (error) {
      console.error('Error completing quiz:', error);
    }
  },

  // Premium tier functions
  checkDailyLimit: async () => {
    const { currentUser } = get();
    if (!currentUser || currentUser === 'guest') return;

    try {
      const updatedUser = await checkAndResetDailyLimit(currentUser);
      set({ currentUser: updatedUser });
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  },

  canUserAnswer: () => {
    const { currentUser } = get();
    if (!currentUser) return false;
    if (currentUser === 'guest') return true; // Guest mode handled separately
    return canAnswerQuestion(currentUser);
  },

  incrementQuestionCount: async () => {
    const { currentUser } = get();
    if (!currentUser || currentUser === 'guest') return;

    try {
      const updatedUser = await incrementQuestionsAnswered(currentUser.username);
      if (updatedUser) {
        set({ currentUser: updatedUser });
      }
    } catch (error) {
      console.error('Error incrementing question count:', error);
    }
  },

  /**
   * Get questions based on study mode
   * Returns shuffled questions for the session
   */
  getQuestionsForSession: (
    studyMode: StudyMode,
    testVersion: TestVersion,
    user: User,
    allQuestions2008: Question[],
    allQuestions2025: Question[]
  ): Question[] => {
    const allQuestions = testVersion === '2025' ? allQuestions2025 : allQuestions2008;
    const askedField = testVersion === '2025' ? 'questions_asked_2025' : 'questions_asked_2008';
    const correctField = testVersion === '2025' ? 'questions_correct_2025' : 'questions_correct_2008';

    if (studyMode === 'focused') {
      // Focused mode: show only incorrect/partial questions
      const asked = user[askedField] || [];
      const correct = user[correctField] || [];
      const incorrect = asked.filter(idx => !correct.includes(idx));

      if (incorrect.length === 0) {
        throw new Error('No questions to review');
      }

      // Limit to 20 questions, shuffle for variety
      const limitedIncorrect = incorrect.slice(0, 20);
      const questions = limitedIncorrect.map(idx => allQuestions[idx]);

      // Fisher-Yates shuffle
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    // Random mode: prioritize unasked questions
    const asked = user[askedField] || [];
    const allIndices = allQuestions.map((_, idx) => idx);
    const unasked = allIndices.filter(idx => !asked.includes(idx));

    // If all questions asked, reshuffle all
    if (unasked.length === 0) {
      const shuffled = [...allQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    // Shuffle unasked questions
    const shuffledUnasked = [...unasked];
    for (let i = shuffledUnasked.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledUnasked[i], shuffledUnasked[j]] = [shuffledUnasked[j], shuffledUnasked[i]];
    }

    const questionsNeeded = testVersion === '2025' ? 20 : 10;

    // If not enough unasked, mix with shuffled asked
    if (shuffledUnasked.length < questionsNeeded) {
      const shuffledAsked = [...asked];
      for (let i = shuffledAsked.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledAsked[i], shuffledAsked[j]] = [shuffledAsked[j], shuffledAsked[i]];
      }
      const combined = [...shuffledUnasked, ...shuffledAsked].slice(0, questionsNeeded);
      return combined.map(idx => allQuestions[idx]);
    }

    // Return unasked questions
    return shuffledUnasked.slice(0, questionsNeeded).map(idx => allQuestions[idx]);
  },
}));

// Helper to store logged in user
export const storeLoggedInUser = async (username: string) => {
  try {
    await AsyncStorage.setItem('loggedInUser', username);
  } catch (error) {
    console.error('Error storing user:', error);
  }
};

export const getLoggedInUser = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('loggedInUser');
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const clearLoggedInUser = async () => {
  try {
    await AsyncStorage.removeItem('loggedInUser');
  } catch (error) {
    console.error('Error clearing user:', error);
  }
};
