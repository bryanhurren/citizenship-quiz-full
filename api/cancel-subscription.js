const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { verifyUserOwnership } = require('./lib/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify the authenticated user owns this userId
    const authResult = await verifyUserOwnership(req, userId);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: authResult.error });
    }

    console.log('Cancel subscription request for userId:', userId);

    // Get user's subscription info from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.subscription_tier !== 'premium') {
      return res.status(400).json({ error: 'User does not have an active premium subscription' });
    }

    // For now, we don't store stripe_subscription_id, so we need to find it via Stripe API
    // Search for active subscriptions for this user's metadata
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
    });

    // Find subscription with matching userId in metadata
    const userSubscription = subscriptions.data.find(sub => {
      // Check if subscription has metadata with userId
      if (sub.metadata && sub.metadata.userId === userId) {
        return true;
      }
      // Also check the latest invoice's session metadata
      return false;
    });

    if (!userSubscription) {
      // Try to find via sessions
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
      });

      const userSession = sessions.data.find(session =>
        session.metadata?.userId === userId && session.subscription
      );

      if (!userSession || !userSession.subscription) {
        return res.status(404).json({ error: 'No active subscription found for this user' });
      }

      // Cancel the subscription at period end
      const canceledSubscription = await stripe.subscriptions.update(
        userSession.subscription,
        {
          cancel_at_period_end: true,
        }
      );

      console.log('Subscription canceled at period end:', canceledSubscription.id);

      return res.json({
        success: true,
        message: 'Subscription will be canceled at the end of the billing period',
        cancelAt: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
      });
    }

    // Cancel the subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(
      userSubscription.id,
      {
        cancel_at_period_end: true,
      }
    );

    console.log('Subscription canceled at period end:', canceledSubscription.id);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
};
