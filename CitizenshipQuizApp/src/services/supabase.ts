import { createClient } from '@supabase/supabase-js';
import { User, Session } from '../types';

// Supabase Configuration
const SUPABASE_URL = 'https://calexrqhodjgxlojokbb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbGV4cnFob2RqZ3hsb2pva2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjMwNDEsImV4cCI6MjA3NjE5OTA0MX0.b7zkaCz7IQ53yeR7LgfMsPq3C6NHZi5Swr-PSMuN-is';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// User database operations
export const getUser = async (username: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Get user by Apple user ID (stable identifier across sessions)
export const getUserByAppleId = async (appleUserId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('apple_user_id', appleUserId)
      .maybeSingle();

    if (error) {
      console.error('Error getting user by Apple ID:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error getting user by Apple ID:', error);
    return null;
  }
};

export const updateUser = async (username: string, updates: Partial<User>): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
};

export const createUser = async (user: Partial<User>): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const deleteUser = async (username: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('username', username);

    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
};

export const validateInviteCode = async (code: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
};

export const markInviteCodeAsUsed = async (code: string, username: string): Promise<void> => {
  await supabase
    .from('invite_codes')
    .update({
      used: true,
      used_by: username,
      used_at: new Date().toISOString(),
    })
    .eq('code', code);
};

// Premium tier and daily limit operations
export const checkAndResetDailyLimit = async (user: User): Promise<User> => {
  // Check if it's a new day (more than 24 hours since last reset)
  const now = new Date();
  const resetAt = user.questions_reset_at ? new Date(user.questions_reset_at) : new Date(0);
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    // Reset the daily counter
    const updatedUser = await updateUser(user.username, {
      questions_answered_today: 0,
      questions_reset_at: now.toISOString(),
    });
    return updatedUser || user;
  }

  return user;
};

export const canAnswerQuestion = (user: User): boolean => {
  // Premium users can answer if subscription hasn't expired
  if (user.subscription_tier === 'premium') {
    // Check if subscription is still valid
    if (!user.subscription_expires_at) {
      // Legacy fallback: If no expiration date, deny access and log error
      console.error('⚠️ Premium user missing expiration date:', user.username);
      return false;
    }
    const expiresAt = new Date(user.subscription_expires_at);
    const now = new Date();
    return expiresAt > now;
  }

  // Free users have 5 questions per day limit
  return user.questions_answered_today < 5;
};

export const incrementQuestionsAnswered = async (username: string): Promise<User | null> => {
  try {
    // Get current user
    const user = await getUser(username);
    if (!user) return null;

    // Increment counter
    const updatedUser = await updateUser(username, {
      questions_answered_today: user.questions_answered_today + 1,
    });

    return updatedUser;
  } catch (error) {
    console.error('Error incrementing questions answered:', error);
    return null;
  }
};

// Session operations
export const saveSession = async (sessionData: Omit<Session, 'id' | 'created_at'>): Promise<Session | null> => {
  try {
    console.log('saveSession called with data:', sessionData);
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error saving session:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return null;
    }

    console.log('Session saved successfully to Supabase:', data);
    return data as Session;
  } catch (error) {
    console.error('Exception saving session:', error);
    return null;
  }
};

export const getUserSessions = async (userId: string): Promise<Session[]> => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }

    return data as Session[];
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
};

/**
 * Update question progress tracking after user answers a question
 */
export const updateQuestionProgress = async (
  username: string,
  questionIndex: number,
  grade: 'correct' | 'partial' | 'incorrect',
  testVersion: '2008' | '2025'
): Promise<void> => {
  try {
    const askedField = testVersion === '2025' ? 'questions_asked_2025' : 'questions_asked_2008';
    const correctField = testVersion === '2025' ? 'questions_correct_2025' : 'questions_correct_2008';

    // Get current user data
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select(`${askedField}, ${correctField}`)
      .eq('username', username)
      .single();

    if (fetchError) throw fetchError;

    const asked = user[askedField] || [];
    const correct = user[correctField] || [];

    // Add to asked array if not already there
    let updatedAsked = asked;
    if (!asked.includes(questionIndex)) {
      updatedAsked = [...asked, questionIndex];
    }

    // Update correctness
    let updatedCorrect = correct;
    if (grade === 'correct') {
      // Add to correct if not already there
      if (!correct.includes(questionIndex)) {
        updatedCorrect = [...correct, questionIndex];
      }
    } else {
      // Remove from correct if it was there (user got it wrong this time)
      updatedCorrect = correct.filter(idx => idx !== questionIndex);
    }

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        [askedField]: updatedAsked,
        [correctField]: updatedCorrect,
      })
      .eq('username', username);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating question progress:', error);
    throw error;
  }
};

/**
 * Get progress statistics for a specific test version
 */
export const getProgressStats = async (
  username: string,
  testVersion: '2008' | '2025'
): Promise<{
  totalAsked: number;
  totalCorrect: number;
  totalIncorrect: number;
  incorrectIndices: number[];
  percentageCorrect: number;
  totalQuestions: number;
}> => {
  try {
    const askedField = testVersion === '2025' ? 'questions_asked_2025' : 'questions_asked_2008';
    const correctField = testVersion === '2025' ? 'questions_correct_2025' : 'questions_correct_2008';
    const totalQuestions = testVersion === '2025' ? 128 : 100;

    const { data: user, error } = await supabase
      .from('users')
      .select(`${askedField}, ${correctField}`)
      .eq('username', username)
      .single();

    if (error) throw error;

    const asked = user[askedField] || [];
    const correct = user[correctField] || [];
    const incorrect = asked.filter(idx => !correct.includes(idx));

    return {
      totalAsked: asked.length,
      totalCorrect: correct.length,
      totalIncorrect: incorrect.length,
      incorrectIndices: incorrect,
      percentageCorrect: asked.length > 0 ? (correct.length / asked.length) * 100 : 0,
      totalQuestions,
    };
  } catch (error) {
    console.error('Error getting progress stats:', error);
    throw error;
  }
};

/**
 * Reset progress for a specific test version (clear all tracking)
 */
export const resetProgress = async (
  username: string,
  testVersion: '2008' | '2025'
): Promise<void> => {
  try {
    const askedField = testVersion === '2025' ? 'questions_asked_2025' : 'questions_asked_2008';
    const correctField = testVersion === '2025' ? 'questions_correct_2025' : 'questions_correct_2008';

    const { error } = await supabase
      .from('users')
      .update({
        [askedField]: [],
        [correctField]: [],
      })
      .eq('username', username);

    if (error) throw error;
  } catch (error) {
    console.error('Error resetting progress:', error);
    throw error;
  }
};
