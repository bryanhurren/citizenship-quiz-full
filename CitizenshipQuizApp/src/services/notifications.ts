import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
// Only show notifications when app is in background/closed
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const appState = await Notifications.getPresentedNotificationsAsync();

    return {
      shouldShowBanner: false,  // Don't show when app is in foreground
      shouldPlaySound: false,   // Don't play sound when app is in foreground
      shouldSetBadge: false,
    };
  },
});

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
 * Note: The first notification will fire at the NEXT occurrence of the specified time.
 * If the time has already passed today, it will fire tomorrow at that time.
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

    // Calculate next occurrence of the specified time
    const now = new Date();
    const nextOccurrence = new Date();
    nextOccurrence.setHours(hour, minute, 0, 0);

    // If the time has already passed today, OR if it's less than 2 minutes away, schedule for tomorrow
    // This 2-minute buffer ensures we never accidentally schedule a notification in the immediate past
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
    if (nextOccurrence <= twoMinutesFromNow) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      console.log('⏭️  Time has passed or is too soon, moving to tomorrow');
    }

    // Verify the first notification is in the future
    const minutesUntilFirst = Math.round((nextOccurrence.getTime() - now.getTime()) / 60000);
    console.log('📅 Scheduling notifications starting from:', nextOccurrence.toLocaleString());
    console.log('🕐 Current time:', now.toLocaleString());
    console.log('⏰ Time until first notification:', minutesUntilFirst, 'minutes');

    // Safety check - if somehow the calculated time is in the past, error out
    if (nextOccurrence <= now) {
      console.error('❌ ERROR: Calculated notification time is in the past!');
      console.error('   Now:', now.toLocaleString());
      console.error('   Next occurrence:', nextOccurrence.toLocaleString());
      return null;
    }

    // Schedule notifications for the next 30 days
    // This ensures reliable daily notifications without complex repeating logic
    const notificationIds: string[] = [];

    for (let day = 0; day < 30; day++) {
      const scheduledDate = new Date(nextOccurrence);
      scheduledDate.setDate(nextOccurrence.getDate() + day);

      // Use explicit DateTriggerInput type
      const trigger: Notifications.DateTriggerInput = {
        date: scheduledDate,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Continue Your Citizenship Quiz',
          body: 'Keep practicing to achieve your best score!',
          data: { type: 'daily_reminder', day },
        },
        trigger,
      });

      notificationIds.push(notificationId);

      // Log first few scheduled notifications for debugging
      if (day < 3) {
        console.log(`📆 Notification ${day + 1} scheduled for:`, scheduledDate.toLocaleString());
      }
    }

    console.log('✅ Scheduled 30 daily notifications');
    console.log('📆 First notification:', nextOccurrence.toLocaleString());
    const lastNotification = new Date(nextOccurrence);
    lastNotification.setDate(nextOccurrence.getDate() + 29);
    console.log('📆 Last notification:', lastNotification.toLocaleString());
    console.log('⚠️  NO notifications should fire immediately!');

    return notificationIds[0]; // Return first notification ID
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
