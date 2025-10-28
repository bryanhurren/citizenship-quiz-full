const Sentry = require('@sentry/node');

let initialized = false;

function initSentry() {
  if (initialized) return;

  // Only initialize if DSN is provided
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV || 'development',
      tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

      // Don't send errors in development
      enabled: process.env.VERCEL_ENV === 'production',
    });

    initialized = true;
    console.log('✅ Sentry initialized');
  } else {
    console.log('⚠️ SENTRY_DSN not found - error tracking disabled');
  }
}

function captureException(error, context = {}) {
  if (initialized) {
    Sentry.captureException(error, {
      extra: context
    });
  } else {
    console.error('❌ Error (Sentry not initialized):', error);
  }
}

function captureMessage(message, level = 'info', context = {}) {
  if (initialized) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    });
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

// Wrapper for API endpoints to catch and report errors
function withSentry(handler) {
  return async (req, res) => {
    initSentry();

    try {
      return await handler(req, res);
    } catch (error) {
      captureException(error, {
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query
      });

      // Re-throw so the endpoint can handle it
      throw error;
    }
  };
}

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  withSentry,
  Sentry
};
