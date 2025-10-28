const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Disable body parsing - we need raw body for Stripe signature verification
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Helper to get raw body as Buffer
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Get the raw body - must be a Buffer or string, NOT parsed JSON
    let rawBody;

    if (req.body instanceof Buffer) {
      // Already a buffer
      rawBody = req.body;
    } else if (typeof req.body === 'string') {
      // Already a string
      rawBody = req.body;
    } else if (req.readable) {
      // Stream - read it
      rawBody = await buffer(req);
    } else {
      // Body was already parsed as JSON - this won't work for signature verification
      // This means we need to configure Vercel to not parse the body
      console.error('Body was already parsed as JSON, signature verification will fail');
      rawBody = JSON.stringify(req.body);
    }

    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    console.error('Body type:', typeof req.body);
    console.error('Is Buffer:', req.body instanceof Buffer);
    console.error('Is readable:', req.readable);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;

      case 'customer.subscription.created':
        const createdSubscription = event.data.object;
        await handleSubscriptionCreated(createdSubscription);
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
  console.log('handleCheckoutSessionCompleted called');
  console.log('Session metadata:', JSON.stringify(session.metadata));

  // Trim whitespace and validate UUID
  const userId = session.metadata?.userId?.trim();
  const subscriptionId = session.subscription;

  if (!userId) {
    console.error('No userId in session metadata');
    throw new Error('No userId in session metadata');
  }

  console.log(`Processing checkout for userId: "${userId}" (type: ${typeof userId}), subscriptionId: ${subscriptionId}`);

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    console.error('Invalid UUID format:', userId);
    throw new Error(`Invalid UUID format: ${userId}`);
  }

  if (!subscriptionId) {
    console.error('No subscription ID in session - might be a one-time payment');
    // For one-time payments, we might handle differently
    // For now, just log and return
    return;
  }

  // Fetch the subscription details to get the expiration date
  let expiresAt = null;
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.current_period_end) {
      expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
      console.log(`✅ Subscription expires at: ${expiresAt}`);
    }
  } catch (err) {
    console.error('⚠️ Error fetching subscription details:', err);
    // Continue with 7-day fallback
  }

  // If we don't have an expiration date from Stripe, use 7-day default
  if (!expiresAt) {
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 7);
    expiresAt = defaultExpiration.toISOString();
    console.log(`⚠️ No expiration date from Stripe - using 7-day default: ${expiresAt}`);
  }

  // Update user with subscription info including expiration
  console.log(`Attempting to update user with id: "${userId}"`);

  const updateData = {
    subscription_tier: 'premium',
    subscription_expires_at: expiresAt, // Always set expiration (either real or 7-day default)
    stripe_subscription_id: subscriptionId, // Store for later webhook updates
  };

  const { data, error} = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select();

  if (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }

  console.log(`Subscription activated for user ${userId}. Updated rows:`, JSON.stringify(data));
}

async function handleSubscriptionCreated(subscription) {
  console.log('handleSubscriptionCreated called');
  console.log(`Subscription ID: ${subscription.id}, Customer: ${subscription.customer}, Status: ${subscription.status}`);

  // Calculate expiration with fallback logic
  let expiresAt = null;

  if (!subscription.current_period_end) {
    console.error('⚠️ ALERT: No current_period_end in subscription - this should not happen for recurring subscriptions!');
    console.error('⚠️ Subscription data:', JSON.stringify(subscription, null, 2));

    // Use 7-day fallback instead of failing
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 7);
    expiresAt = defaultExpiration.toISOString();
    console.log(`⚠️ Using 7-day fallback expiration: ${expiresAt}`);

    // TODO: Send alert to admin - this indicates a configuration problem
  } else {
    expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
    console.log(`✅ Subscription expires at: ${expiresAt}`);
  }

  // Look up user by stripe_subscription_id and update expiration
  const { data, error } = await supabase
    .from('users')
    .update({ subscription_expires_at: expiresAt })
    .eq('stripe_subscription_id', subscription.id)
    .select();

  if (error) {
    console.error('❌ Error updating user expiration from subscription.created:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ No user found with stripe_subscription_id:', subscription.id);
    console.warn('This is expected if checkout.session.completed hasn\'t fired yet');
    return;
  }

  console.log(`✅ Updated expiration for user from subscription.created event:`, JSON.stringify(data));
}

async function handleSubscriptionUpdated(subscription) {
  console.log('handleSubscriptionUpdated called');
  console.log(`Subscription ID: ${subscription.id}, Customer: ${subscription.customer}, Status: ${subscription.status}`);

  // Calculate expiration with fallback logic
  let expiresAt = null;

  if (!subscription.current_period_end) {
    console.error('⚠️ ALERT: No current_period_end in subscription.updated - using 7-day fallback');
    console.error('⚠️ Subscription data:', JSON.stringify(subscription, null, 2));

    // Use 7-day fallback
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 7);
    expiresAt = defaultExpiration.toISOString();
    console.log(`⚠️ Using 7-day fallback expiration: ${expiresAt}`);
  } else {
    expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
    console.log(`✅ Subscription updated, new expiration: ${expiresAt}`);
  }

  const { data, error } = await supabase
    .from('users')
    .update({ subscription_expires_at: expiresAt })
    .eq('stripe_subscription_id', subscription.id)
    .select();

  if (error) {
    console.error('❌ Error updating user expiration from subscription.updated:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Updated expiration for user from subscription.updated event:`, JSON.stringify(data));
  } else {
    console.warn('⚠️ No user found with stripe_subscription_id:', subscription.id);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('handleSubscriptionDeleted called');
  console.log(`Subscription ID: ${subscription.id}, Customer: ${subscription.customer}`);

  // Downgrade user to free tier when subscription is cancelled
  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_expires_at: null,
      stripe_subscription_id: null,
    })
    .eq('stripe_subscription_id', subscription.id)
    .select();

  if (error) {
    console.error('❌ Error downgrading user from subscription.deleted:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Downgraded user to free tier from subscription.deleted event:`, JSON.stringify(data));
  } else {
    console.warn('⚠️ No user found with stripe_subscription_id:', subscription.id);
  }
}
