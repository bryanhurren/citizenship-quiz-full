const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Simple secret-based auth for admin endpoint
  const { secret } = req.query;

  if (secret !== 'temp-fix-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔍 Starting subscription health check...');

    // Get all users with stripe_subscription_id
    const { data: usersWithStripe, error: usersError } = await supabase
      .from('users')
      .select('id, username, subscription_tier, subscription_expires_at, stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Database error', details: usersError });
    }

    console.log(`Found ${usersWithStripe.length} users with Stripe subscription IDs`);

    const issues = [];
    const healthy = [];

    // Check each user's subscription status
    for (const user of usersWithStripe) {
      try {
        // Fetch subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

        const issue = {
          user_id: user.id,
          user_email: user.username,
          database_tier: user.subscription_tier,
          database_expires: user.subscription_expires_at,
          stripe_subscription_id: user.stripe_subscription_id,
          stripe_status: subscription.status,
          stripe_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          problems: [],
        };

        // Check for issues
        if (!subscription.current_period_end) {
          issue.problems.push('CRITICAL: Stripe subscription missing current_period_end');
        }

        if (subscription.status === 'active' && user.subscription_tier !== 'premium') {
          issue.problems.push(`Database shows '${user.subscription_tier}' but Stripe is 'active'`);
        }

        if (subscription.status !== 'active' && user.subscription_tier === 'premium') {
          issue.problems.push(`Database shows 'premium' but Stripe is '${subscription.status}'`);
        }

        if (!user.subscription_expires_at && subscription.status === 'active') {
          issue.problems.push('Database missing expiration date for active subscription');
        }

        if (subscription.current_period_end && user.subscription_expires_at) {
          const stripeExpires = new Date(subscription.current_period_end * 1000);
          const dbExpires = new Date(user.subscription_expires_at);
          const diffMs = Math.abs(stripeExpires - dbExpires);
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (diffDays > 1) {
            issue.problems.push(
              `Expiration date mismatch: Stripe=${stripeExpires.toISOString()}, DB=${user.subscription_expires_at} (${diffDays.toFixed(1)} days difference)`
            );
          }
        }

        if (issue.problems.length > 0) {
          issues.push(issue);
        } else {
          healthy.push({
            user_email: user.username,
            tier: user.subscription_tier,
            expires: user.subscription_expires_at,
            stripe_status: subscription.status,
          });
        }
      } catch (stripeError) {
        // Subscription not found in Stripe
        issues.push({
          user_id: user.id,
          user_email: user.username,
          database_tier: user.subscription_tier,
          database_expires: user.subscription_expires_at,
          stripe_subscription_id: user.stripe_subscription_id,
          problems: [`Stripe Error: ${stripeError.message}`],
        });
      }
    }

    console.log(`✅ Health check complete. Found ${issues.length} issues and ${healthy.length} healthy subscriptions`);

    return res.json({
      summary: {
        total_users_checked: usersWithStripe.length,
        issues_found: issues.length,
        healthy_subscriptions: healthy.length,
      },
      issues: issues,
      healthy: healthy,
    });
  } catch (error) {
    console.error('❌ Error in subscription health check:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};
