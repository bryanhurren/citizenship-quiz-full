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
  // Premium users can always answer
  if (user.subscription_tier === 'premium') {
    // Check if subscription is still valid
    if (user.subscription_expires_at) {
      const expiresAt = new Date(user.subscription_expires_at);
      const now = new Date();
      if (expiresAt > now) {
        return true;
      }
    }
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
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Error saving session:', error);
      return null;
    }

    return data as Session;
  } catch (error) {
    console.error('Error saving session:', error);
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

// Access request operations (web only)
export const requestAccess = async (username: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        access_status: 'pending',
        access_requested_at: new Date().toISOString(),
      })
      .eq('username', username);

    if (error) {
      console.error('Error requesting access:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting access:', error);
    return false;
  }
};

export const grantAccess = async (username: string, grantedBy: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        access_status: 'granted',
        access_granted_at: new Date().toISOString(),
        access_granted_by: grantedBy,
      })
      .eq('username', username);

    if (error) {
      console.error('Error granting access:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error granting access:', error);
    return false;
  }
};

export const denyAccess = async (username: string, deniedBy: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        access_status: 'denied',
      })
      .eq('username', username);

    if (error) {
      console.error('Error denying access:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error denying access:', error);
    return false;
  }
};
