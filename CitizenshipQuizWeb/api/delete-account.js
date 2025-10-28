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

    console.log('Delete account request for userId:', userId);

    // Get user data before deletion
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has premium subscription, cancel it first
    if (user.subscription_tier === 'premium') {
      try {
        // Find and cancel active subscriptions
        const sessions = await stripe.checkout.sessions.list({
          limit: 100,
        });

        const userSession = sessions.data.find(session =>
          session.metadata?.userId === userId && session.subscription
        );

        if (userSession && userSession.subscription) {
          // Cancel immediately (not at period end)
          await stripe.subscriptions.cancel(userSession.subscription);
          console.log('Canceled subscription:', userSession.subscription);
        }
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError);
        // Continue with account deletion even if Stripe cancelation fails
      }
    }

    // Delete user from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    console.log('Account deleted successfully for userId:', userId);

    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: error.message });
  }
};
