import { loadStripe, Stripe } from '@stripe/stripe-js';

// Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
}

export const createCheckoutSession = async (params: CreateCheckoutSessionParams) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const { sessionId, url } = await response.json();
    return { sessionId, url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const redirectToCheckout = async (params: CreateCheckoutSessionParams) => {
  try {
    // Log browser/device info for debugging Android issues
    console.log('🔍 Browser info:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
    });

    const { url } = await createCheckoutSession(params);

    // Redirect to Stripe Checkout
    if (url) {
      console.log('✅ Redirecting to Stripe checkout:', url);
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error('❌ Error redirecting to checkout:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      userId: params.userId,
      userEmail: params.userEmail,
    });
    throw error;
  }
};

export const cancelSubscription = async (userId: string, userEmail: string) => {
  try {
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userEmail }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel subscription');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

export const deleteAccount = async (userId: string, userEmail: string) => {
  try {
    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userEmail }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete account');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};
