const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { checkRateLimit } = require('./lib/rateLimit');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Enable CORS - restrict to production domain
  const allowedOrigins = ['https://www.theeclodapps.com', 'http://localhost:8082'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userEmail } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Rate limiting: 5 requests per minute per user
    const rateLimitResult = checkRateLimit(userId, 5, 60000);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        resetAt: rateLimitResult.resetAt,
      });
    }

    // Check if user already has an active subscription
    console.log(`Checking for existing subscriptions for ${userEmail}`);

    // Search for existing customers with this email
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 10,
    });

    // Check if any customer has an active subscription
    for (const customer of existingCustomers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        console.log(`⚠️ User ${userEmail} already has ${subscriptions.data.length} active subscription(s)`);

        // Return error to prevent duplicate subscription
        return res.status(400).json({
          error: 'You already have an active subscription',
          existingSubscriptionId: subscriptions.data[0].id,
          customerId: customer.id,
          message: 'Please contact support if you believe this is an error.',
        });
      }
    }

    console.log(`✅ No existing subscriptions found for ${userEmail}, creating new checkout session`);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8082'}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8082'}?canceled=true`,
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        userEmail,
      },
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
};
