import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, QuizState, User, QuestionResult, QuizMode, TestVersion } from '../types';
import { getUser, updateUser, checkAndResetDailyLimit, canAnswerQuestion, incrementQuestionsAnswered } from '../services/supabase';

interface QuizStore extends QuizState {
  // Actions
  setCurrentUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setSelectedMode: (mode: QuizMode) => void;
  setSelectedTestVersion: (version: TestVersion) => void;
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
  saveSession: () => Promise<void>;
  completeQuiz: () => Promise<void>;
  // Premium tier functions
  checkDailyLimit: () => Promise<void>;
  canUserAnswer: () => boolean;
  incrementQuestionCount: () => Promise<void>;
}

const initialState: QuizState = {
  currentUser: null,
  selectedMode: null,
  selectedTestVersion: null,
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

  updateUser: async (updates) => {
    const { currentUser } = get();
    if (!currentUser) return;

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
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  },

  saveSession: async () => {
    const state = get();
    if (!state.currentUser) return;

    try {
      // Convert shuffled questions to indices for storage
      // We'll store indices pointing to the original question set
      const shuffledIndices = state.shuffledQuestions.map(q => {
        // Find the index of this question in the original allQuestions or allQuestions2025
        const { allQuestions } = require('../data/questions');
        const { allQuestions2025 } = require('../data/questions-2025');
        const sourceQuestions = state.selectedTestVersion === '2025' ? allQuestions2025 : allQuestions;
        return sourceQuestions.findIndex((sq: any) => sq.q === q.q && sq.a === q.a);
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
    if (!state.currentUser) return;

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
        session_status: undefined, // Clear session status when quiz is completed
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
    if (!currentUser) return;

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
    return canAnswerQuestion(currentUser);
  },

  incrementQuestionCount: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      const updatedUser = await incrementQuestionsAnswered(currentUser.username);
      if (updatedUser) {
        set({ currentUser: updatedUser });
      }
    } catch (error) {
      console.error('Error incrementing question count:', error);
    }
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
