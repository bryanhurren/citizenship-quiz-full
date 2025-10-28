const { createClient } = require('@supabase/supabase-js');
const { initSentry } = require('./lib/sentry');

// Initialize Sentry
initSentry();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  const startTime = Date.now();
  const checks = {
    supabase: { status: 'unknown', latency: 0 },
    claude: { status: 'unknown', latency: 0 },
    stripe: { status: 'unknown', latency: 0 },
  };

  // Check Supabase
  try {
    const supabaseStart = Date.now();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    checks.supabase.latency = Date.now() - supabaseStart;

    if (error) {
      checks.supabase.status = 'error';
      checks.supabase.error = error.message;
    } else {
      checks.supabase.status = 'healthy';
    }
  } catch (error) {
    checks.supabase.status = 'error';
    checks.supabase.error = error.message;
  }

  // Check Claude API (via simple request to validate key exists)
  try {
    const claudeStart = Date.now();

    if (process.env.ANTHROPIC_API_KEY) {
      checks.claude.status = 'healthy';
      checks.claude.message = 'API key configured';
    } else {
      checks.claude.status = 'warning';
      checks.claude.message = 'API key not configured';
    }

    checks.claude.latency = Date.now() - claudeStart;
  } catch (error) {
    checks.claude.status = 'error';
    checks.claude.error = error.message;
  }

  // Check Stripe
  try {
    const stripeStart = Date.now();

    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID) {
      checks.stripe.status = 'healthy';
      checks.stripe.message = 'API keys configured';
    } else {
      checks.stripe.status = 'warning';
      checks.stripe.message = 'API keys not fully configured';
    }

    checks.stripe.latency = Date.now() - stripeStart;
  } catch (error) {
    checks.stripe.status = 'error';
    checks.stripe.error = error.message;
  }

  // Determine overall health
  const allHealthy = Object.values(checks).every(
    check => check.status === 'healthy'
  );
  const anyErrors = Object.values(checks).some(
    check => check.status === 'error'
  );

  const overallStatus = allHealthy ? 'healthy' : anyErrors ? 'unhealthy' : 'degraded';
  const totalLatency = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    latency: totalLatency,
    checks,
    environment: process.env.VERCEL_ENV || 'development',
  };

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;

  res.status(statusCode).json(response);
};
