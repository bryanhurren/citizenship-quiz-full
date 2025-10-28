// Core Types for Citizenship Quiz App

export interface Question {
  q: string;
  a: string;
}

export type TestVersion = '2008' | '2025';
export type QuizMode = 'formal' | 'comedy';
export type StudyMode = 'random' | 'focused';
export type AnswerGrade = 'correct' | 'partial' | 'incorrect';
export type SubscriptionTier = 'free' | 'premium';
export type SessionStatus = 'passed' | 'failed' | 'in_progress' | 'not_started';

// Chat message types for the chat-like interface
export type ChatMessageType = 'welcome' | 'question' | 'user_answer' | 'feedback';

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  grade?: AnswerGrade; // For feedback messages
  isCorrectAnswer?: boolean; // To display correct answer in feedback
  correctAnswer?: string;
  timestamp: Date;
}

export interface QuestionResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  grade: AnswerGrade;
  feedback: string;
}

export interface Session {
  id: string;
  user_id: string;
  test_version: TestVersion;
  mode: QuizMode;
  correct_count: number;
  incorrect_count: number;
  total_questions_asked: number;
  session_status: 'passed' | 'failed';
  completed_at: string;
  question_results: QuestionResult[];
  created_at: string;
}

export interface User {
  id: string; // UUID in Supabase
  username: string;
  email?: string;
  password?: string;
  profile_picture?: string | null;
  apple_user_id?: string | null; // Apple Sign-In stable user identifier
  current_question: number;
  correct_count: number;
  partial_count: number;
  incorrect_count: number;
  question_results: QuestionResult[];
  completed: boolean;
  best_score: number;
  last_session_date: string | null;
  mode?: QuizMode;
  test_version?: TestVersion;
  session_status?: SessionStatus; // Track if session passed/failed
  shuffled_question_indices?: number[] | null; // Stores shuffled question order
  created_at?: string;
  // Premium tier fields
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  notification_enabled: boolean;
  notification_time: string; // HH:MM format in local time (e.g., "09:00")
  last_notification_sent: string | null;
  questions_answered_today: number;
  questions_reset_at: string | null;
  // Progress tracking fields
  questions_asked_2008?: number[];
  questions_asked_2025?: number[];
  questions_correct_2008?: number[];
  questions_correct_2025?: number[];
  study_mode?: StudyMode;
}

export interface EvaluationResponse {
  grade: AnswerGrade;
  feedback: string;
}

export interface ProgressStats {
  totalAsked: number;
  totalCorrect: number;
  totalIncorrect: number;
  incorrectIndices: number[];
  percentageCorrect: number;
  totalQuestions: number;
}

export interface QuizState {
  currentUser: User | 'guest' | null;
  selectedMode: QuizMode | null;
  selectedTestVersion: TestVersion | null;
  studyMode: StudyMode | null;
  currentQuestion: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  questionResults: QuestionResult[];
  shuffledQuestions: Question[];
  hasAnswered: boolean;
  hasRetried: boolean;
  isLoading: boolean;
}

// Navigation types
export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  Login: undefined;
  PastSessions: undefined;
};

export type MainTabParamList = {
  Session: undefined;
  You: undefined;
};

export type SessionStackParamList = {
  ModeSelection: undefined;
  Quiz: undefined;
  Results: undefined;
  FocusedModeComplete: {
    previousIncorrect: number;
    nowCorrect: number;
    stillIncorrect: number;
    previousAccuracy: number;
    newAccuracy: number;
    testVersion: '2008' | '2025';
  };
};
