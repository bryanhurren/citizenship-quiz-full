const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Simple secret-based auth for admin endpoint
  const { secret, userEmail } = req.query;

  // Temporary simple auth - use a fixed secret for testing
  const TEMP_SECRET = 'temp-fix-2025';

  if (secret !== TEMP_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized - use temp-fix-2025 as secret'
    });
  }

  if (!userEmail) {
    return res.status(400).json({ error: 'userEmail query param required' });
  }

  try {
    console.log(`🔍 Searching for Stripe subscriptions for email: ${userEmail}`);

    // Search for customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10,
    });

    if (customers.data.length === 0) {
      return res.status(404).json({
        error: 'No Stripe customer found with that email',
        email: userEmail
      });
    }

    console.log(`✅ Found ${customers.data.length} customer(s)`);

    let activeSubscription = null;
    let customer = null;

    // Check each customer for active subscriptions
    for (const cust of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: cust.id,
        status: 'active',
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        activeSubscription = subscriptions.data[0]; // Take the first active subscription
        customer = cust;
        break;
      }
    }

    if (!activeSubscription) {
      return res.status(404).json({
        error: 'No active subscription found for this customer',
        email: userEmail,
        customersChecked: customers.data.length
      });
    }

    console.log(`✅ Found active subscription: ${activeSubscription.id}`);

    // Get user from Supabase by email
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', userEmail)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(404).json({
        error: 'User not found in database',
        email: userEmail
      });
    }

    const user = users[0];
    console.log(`✅ Found user in database: ${user.id}`);

    // Calculate expiration date with fallback
    let expiresAt;
    if (!activeSubscription.current_period_end) {
      console.warn('⚠️ ALERT: No current_period_end in subscription - using 7-day fallback');
      console.warn('⚠️ Subscription data:', JSON.stringify(activeSubscription, null, 2));

      // Use 7-day fallback
      const defaultExpiration = new Date();
      defaultExpiration.setDate(defaultExpiration.getDate() + 7);
      expiresAt = defaultExpiration.toISOString();
      console.log(`⚠️ Using 7-day fallback expiration: ${expiresAt}`);
    } else {
      expiresAt = new Date(activeSubscription.current_period_end * 1000).toISOString();
      console.log(`Current period end: ${expiresAt}`);
    }

    // Update user with subscription info
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: 'premium',
        subscription_expires_at: expiresAt,
        stripe_subscription_id: activeSubscription.id,
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return res.status(500).json({ error: 'Failed to update user', details: updateError });
    }

    console.log(`✅ Successfully synced subscription for ${userEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Subscription synced successfully',
      warning: !activeSubscription.current_period_end
        ? 'Stripe subscription missing current_period_end - used 7-day fallback'
        : null,
      user: {
        id: user.id,
        email: user.username,
        subscription_tier: 'premium',
        subscription_expires_at: expiresAt,
        stripe_subscription_id: activeSubscription.id,
      },
      subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        current_period_start: activeSubscription.current_period_start
          ? new Date(activeSubscription.current_period_start * 1000).toISOString()
          : null,
        current_period_end: expiresAt,
        used_fallback: !activeSubscription.current_period_end,
      },
    });

  } catch (error) {
    console.error('❌ Error syncing subscription:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
