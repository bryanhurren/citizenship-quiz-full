import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// TODO: Replace 'YOUR_IOS_API_KEY' with your actual iOS API key from:
// RevenueCat Dashboard > Project Settings > API keys > App specific keys
// Your key will start with 'appl_'
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_jyLvJtZCyOENYXldAiDhpIPZCpA',  // Replace with your appl_XXXXXXXXXXXXXXX key
  android: 'YOUR_ANDROID_API_KEY',
});

// Track if RevenueCat has been initialized
let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Should be called on app startup
 */
export async function initializePurchases(userId: string): Promise<void> {
  try {
    // Prevent double initialization
    if (isInitialized) {
      console.log('RevenueCat already initialized, skipping');
      return;
    }

    if (!REVENUECAT_API_KEY) {
      console.error('RevenueCat API key not configured');
      return;
    }

    // Configure RevenueCat
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId,
    });

    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();

    if (offerings.current !== null) {
      return offerings.current;
    }

    console.log('No offerings available');
    return null;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  packageToPurchase: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo | null; error: Error | null }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return { customerInfo, error: null };
  } catch (error: any) {
    console.error('Error purchasing package:', error);

    if (error.userCancelled) {
      return { customerInfo: null, error: new Error('Purchase cancelled') };
    }

    return { customerInfo: null, error };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  customerInfo: CustomerInfo | null;
  error: Error | null;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { customerInfo, error: null };
  } catch (error: any) {
    console.error('Error restoring purchases:', error);
    return { customerInfo: null, error };
  }
}

/**
 * Get current customer info (subscription status)
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
}

/**
 * Check if user has active premium subscription
 */
export async function isPremiumActive(): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();

    if (!customerInfo) {
      return false;
    }

    // Check if user has access to 'premium' entitlement
    // TODO: Replace 'premium' with your actual entitlement identifier from RevenueCat dashboard
    const isPremium =
      typeof customerInfo.entitlements.active['premium'] !== 'undefined';

    return isPremium;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Get subscription expiration date
 */
export async function getSubscriptionExpirationDate(): Promise<Date | null> {
  try {
    const customerInfo = await getCustomerInfo();

    if (!customerInfo) {
      return null;
    }

    // Get expiration date from premium entitlement
    const premiumEntitlement = customerInfo.entitlements.active['premium'];

    if (premiumEntitlement && premiumEntitlement.expirationDate) {
      return new Date(premiumEntitlement.expirationDate);
    }

    return null;
  } catch (error) {
    console.error('Error getting expiration date:', error);
    return null;
  }
}

/**
 * Logout current user from RevenueCat
 */
export async function logoutPurchases(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Error logging out from RevenueCat:', error);
  }
}
