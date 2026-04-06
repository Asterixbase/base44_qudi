// Rate limiting for sensitive financial operations

class RateLimiter {
  constructor() {
    this.attempts = new Map(); // { key: [timestamps] }
    this.blocklist = new Set();
  }

  /**
   * Check if action should be allowed
   * @param {string} key - Unique identifier (e.g., userId, ipAddress)
   * @param {number} maxAttempts - Max attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {object} { allowed, attemptsRemaining, resetIn }
   */
  isAllowed(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    const blockExpiry = this.blocklist.get(key);

    // Check if temporarily blocked
    if (blockExpiry && blockExpiry > now) {
      const resetIn = Math.ceil((blockExpiry - now) / 1000);
      return {
        allowed: false,
        attemptsRemaining: 0,
        resetIn,
        blocked: true,
      };
    }

    // Remove expired attempts
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }

    const timestamps = this.attempts.get(key).filter(t => now - t < windowMs);
    this.attempts.set(key, timestamps);

    const attemptsRemaining = Math.max(0, maxAttempts - timestamps.length - 1);
    const allowed = timestamps.length < maxAttempts;

    if (!allowed) {
      // Block for 15 minutes on max attempts
      this.blocklist.set(key, now + 900000);
    } else {
      // Record this attempt
      timestamps.push(now);
    }

    return {
      allowed,
      attemptsRemaining,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }

  reset(key) {
    this.attempts.delete(key);
    this.blocklist.delete(key);
  }

  block(key, durationMs = 900000) {
    this.blocklist.set(key, Date.now() + durationMs);
  }

  unblock(key) {
    this.blocklist.delete(key);
  }
}

export const globalRateLimiter = new RateLimiter();

// Specific rate limit strategies
export const RateLimitStrategies = {
  PIN_VERIFICATION: { maxAttempts: 3, windowMs: 300000 }, // 3 attempts / 5 min
  COLLECTION_SUBMISSION: { maxAttempts: 5, windowMs: 60000 }, // 5 / min
  PAYOUT_SUBMISSION: { maxAttempts: 3, windowMs: 60000 }, // 3 / min
  DISPUTE_SUBMISSION: { maxAttempts: 2, windowMs: 3600000 }, // 2 / hour
  CROSS_BORDER_PAYOUT: { maxAttempts: 1, windowMs: 86400000 }, // 1 / day per user
};

export function checkRateLimit(userId, action) {
  const strategy = RateLimitStrategies[action];
  if (!strategy) {
    console.warn(`Unknown rate limit strategy: ${action}`);
    return { allowed: true };
  }

  const key = `${userId}:${action}`;
  const result = globalRateLimiter.isAllowed(
    key,
    strategy.maxAttempts,
    strategy.windowMs
  );

  return result;
}

export function enforceRateLimit(userId, action) {
  const result = checkRateLimit(userId, action);
  if (!result.allowed) {
    const error = new Error(
      result.blocked
        ? `Too many attempts. Try again in ${result.resetIn}s`
        : `Rate limited. Please wait ${result.resetIn}s`
    );
    error.code = 'RATE_LIMIT_EXCEEDED';
    error.resetIn = result.resetIn;
    throw error;
  }
  return result;
}