const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const startTime = Date.now();

  const checks = {
    supabase: { status: 'unknown', latency: 0 },
    claude: { status: 'unknown', latency: 0 },
    stripe: { status: 'unknown', latency: 0 },
  };

  let allHealthy = true;
  let anyErrors = false;

  // Check Supabase database connection
  try {
    const supabaseStart = Date.now();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    const supabaseLatency = Date.now() - supabaseStart;

    if (error) {
      checks.supabase = {
        status: 'unhealthy',
        latency: supabaseLatency,
        error: error.message
      };
      anyErrors = true;
      allHealthy = false;
    } else {
      checks.supabase = {
        status: 'healthy',
        latency: supabaseLatency
      };

      // Warning if latency is high
      if (supabaseLatency > 1000) {
        checks.supabase.status = 'degraded';
        checks.supabase.message = 'High latency detected';
        allHealthy = false;
      }
    }
  } catch (error) {
    checks.supabase = {
      status: 'unhealthy',
      error: error.message
    };
    anyErrors = true;
    allHealthy = false;
  }

  // Check Claude API key configuration
  if (process.env.ANTHROPIC_API_KEY) {
    checks.claude = {
      status: 'healthy',
      message: 'API key configured'
    };
  } else {
    checks.claude = {
      status: 'unhealthy',
      message: 'API key not configured'
    };
    anyErrors = true;
    allHealthy = false;
  }

  // Check Stripe API keys configuration
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID) {
    checks.stripe = {
      status: 'healthy',
      message: 'API keys configured'
    };
  } else {
    checks.stripe = {
      status: 'degraded',
      message: 'API keys not fully configured'
    };
    allHealthy = false;
  }

  const totalLatency = Date.now() - startTime;
  const overallStatus = allHealthy ? 'healthy' : anyErrors ? 'unhealthy' : 'degraded';

  // HTTP status codes:
  // 200 - All healthy
  // 207 - Degraded (some warnings)
  // 503 - Unhealthy (critical errors)
  const statusCode = overallStatus === 'healthy' ? 200 :
                     overallStatus === 'degraded' ? 207 : 503;

  return res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    latency: totalLatency,
    checks,
    environment: process.env.VERCEL_ENV || 'development',
  });
};
