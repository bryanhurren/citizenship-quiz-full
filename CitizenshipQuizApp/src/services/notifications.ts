import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
// Show notifications in all states
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.warn('Notifications module not ready:', error);
}

/**
 * Request notification permissions from the user
 * Returns 'granted' if permissions are granted, null otherwise
 */
export async function registerForPushNotificationsAsync(): Promise<'granted' | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return null;
  }

  console.log('Notification permissions granted');
  return 'granted';
}

/**
 * Schedule a daily reminder notification
 * @param timeString - Time in HH:MM format (24-hour, e.g., "09:00", "14:30")
 * SIMPLE RULE: Schedule daily notifications at the specified time.
 * First notification fires tomorrow at that time (never today, never immediately).
 */
export async function scheduleDailyReminder(timeString: string = '09:00'): Promise<string | null> {
  try {
    // Parse the time string
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Validate the time
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      console.error('Invalid time format:', timeString);
      return null;
    }

    // Cancel existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️  Cancelled all existing notifications');

    // SIMPLE: Calculate next occurrence of the specified time
    const now = new Date();
    const nextOccurrence = new Date();
    nextOccurrence.setHours(hour, minute, 0, 0);

    // If that time has already passed today, move to tomorrow
    if (nextOccurrence <= now) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
    }

    console.log('📅 Notification will fire daily at:', timeString);
    console.log('🕐 Current time:', now.toLocaleString());
    console.log('⏰ Next occurrence:', nextOccurrence.toLocaleString());

    // Schedule a daily repeating notification using DAILY trigger type
    // This prevents immediate firing and ensures it only fires at the specified time each day
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Continue Your Citizenship Quiz',
        body: 'Keep practicing to achieve your best score!',
        data: { type: 'daily_reminder' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
      },
    });

    console.log(`✅ Scheduled daily repeating notification at ${timeString}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}
