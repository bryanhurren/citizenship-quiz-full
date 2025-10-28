import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage keys
const KEYS = {
  HAS_EVER_CREATED_ACCOUNT: 'hasEverCreatedAccount',
  GUEST_QUESTIONS_TODAY: 'guestQuestionsToday',
  GUEST_QUESTIONS_RESET_AT: 'guestQuestionsResetAt',
  HAS_SEEN_WELCOME: 'hasSeenWelcome',
};

const GUEST_DAILY_LIMIT = 5;

/**
 * Check if user has ever created an account
 * Returns true if they have, false if they haven't (or first time user)
 */
export const hasEverCreatedAccount = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.HAS_EVER_CREATED_ACCOUNT);
    return value === 'true';
  } catch (error) {
    console.error('Error checking hasEverCreatedAccount:', error);
    return false;
  }
};

/**
 * Mark that user has created an account (set permanent flag)
 */
export const setHasCreatedAccount = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.HAS_EVER_CREATED_ACCOUNT, 'true');
  } catch (error) {
    console.error('Error setting hasCreatedAccount:', error);
  }
};

/**
 * Get guest's question count for today
 * Returns { count, canAnswer, resetAt }
 */
export const getGuestQuestionCount = async (): Promise<{
  count: number;
  canAnswer: boolean;
  resetAt: Date;
}> => {
  try {
    const countStr = await AsyncStorage.getItem(KEYS.GUEST_QUESTIONS_TODAY);
    const resetAtStr = await AsyncStorage.getItem(KEYS.GUEST_QUESTIONS_RESET_AT);

    const now = new Date();
    let resetAt = resetAtStr ? new Date(resetAtStr) : now;

    // Check if we need to reset (new day)
    if (now > resetAt) {
      // Reset count for new day
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Midnight

      await AsyncStorage.setItem(KEYS.GUEST_QUESTIONS_TODAY, '0');
      await AsyncStorage.setItem(KEYS.GUEST_QUESTIONS_RESET_AT, tomorrow.toISOString());

      return {
        count: 0,
        canAnswer: true,
        resetAt: tomorrow,
      };
    }

    const count = countStr ? parseInt(countStr, 10) : 0;

    return {
      count,
      canAnswer: count < GUEST_DAILY_LIMIT,
      resetAt,
    };
  } catch (error) {
    console.error('Error getting guest question count:', error);
    return {
      count: 0,
      canAnswer: true,
      resetAt: new Date(),
    };
  }
};

/**
 * Increment guest's daily question count
 * Returns new count and whether they can still answer
 */
export const incrementGuestQuestionCount = async (): Promise<{
  count: number;
  canAnswer: boolean;
  reachedLimit: boolean;
}> => {
  try {
    const { count: currentCount, resetAt } = await getGuestQuestionCount();
    const newCount = currentCount + 1;

    await AsyncStorage.setItem(KEYS.GUEST_QUESTIONS_TODAY, newCount.toString());

    const reachedLimit = newCount >= GUEST_DAILY_LIMIT;
    const canAnswer = newCount < GUEST_DAILY_LIMIT;

    return {
      count: newCount,
      canAnswer,
      reachedLimit,
    };
  } catch (error) {
    console.error('Error incrementing guest question count:', error);
    return {
      count: 0,
      canAnswer: true,
      reachedLimit: false,
    };
  }
};

/**
 * Clear guest mode data (for testing or if user creates account)
 * Note: Does NOT clear hasEverCreatedAccount flag
 */
export const clearGuestData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.GUEST_QUESTIONS_TODAY);
    await AsyncStorage.removeItem(KEYS.GUEST_QUESTIONS_RESET_AT);
  } catch (error) {
    console.error('Error clearing guest data:', error);
  }
};

/**
 * Check if user has seen the welcome screen
 * Returns true if they have, false if they haven't (first time user)
 */
export const hasSeenWelcome = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.HAS_SEEN_WELCOME);
    return value === 'true';
  } catch (error) {
    console.error('Error checking hasSeenWelcome:', error);
    return false;
  }
};

/**
 * Mark that user has seen the welcome screen
 */
export const setWelcomeShown = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.HAS_SEEN_WELCOME, 'true');
  } catch (error) {
    console.error('Error setting welcomeShown:', error);
  }
};
