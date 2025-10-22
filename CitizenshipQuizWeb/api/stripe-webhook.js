const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ error: error.message });
  }
};

async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const subscriptionId = session.subscription;

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  // Update user in database
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_expires_at: currentPeriodEnd.toISOString(),
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer,
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }

  console.log(`Subscription activated for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;

  // Find user by stripe_customer_id
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!users) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const status = subscription.status;

  // Update subscription
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: status === 'active' ? 'premium' : 'free',
      subscription_expires_at: currentPeriodEnd.toISOString(),
    })
    .eq('id', users.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription updated for user ${users.id}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  // Find user by stripe_customer_id
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!users) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  // Downgrade to free tier
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_expires_at: null,
    })
    .eq('id', users.id);

  if (error) {
    console.error('Error downgrading subscription:', error);
    throw error;
  }

  console.log(`Subscription cancelled for user ${users.id}`);
}
