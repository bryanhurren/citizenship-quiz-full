// Simple in-memory rate limiting
// For production, consider using Redis or a proper rate limiting service

const rateLimitStore = new Map();

/**
 * Simple rate limiter
 * @param {string} identifier - Unique identifier (IP, userId, etc.)
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} { allowed: boolean, remaining: number, resetAt: Date }
 */
function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    const cutoff = now - windowMs;
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < cutoff) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || now > record.resetAt) {
    // New window
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt),
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: new Date(record.resetAt),
  };
}

module.exports = {
  checkRateLimit,
};
