// Web version - purchases handled differently on web
// For now, all users are treated as free tier with 5 questions/day limit

export const initializeRevenueCat = async (): Promise<void> => {
  console.log('RevenueCat not available on web');
};

export const getOfferings = async (): Promise<any | null> => {
  console.log('Offerings not available on web');
  return null;
};

export const purchasePackage = async (packageToPurchase: any): Promise<boolean> => {
  console.log('Purchase not available on web');
  return false;
};

export const restorePurchases = async (): Promise<boolean> => {
  console.log('Restore not available on web');
  return false;
};

export const checkSubscriptionStatus = async (): Promise<{
  isPremium: boolean;
  expiresAt: string | null;
}> => {
  // Web users managed through admin console only
  return {
    isPremium: false,
    expiresAt: null,
  };
};
