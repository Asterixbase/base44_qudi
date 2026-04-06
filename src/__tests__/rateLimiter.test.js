/* eslint-env jest */
import { globalRateLimiter, checkRateLimit, RateLimitStrategies } from '../lib/rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    globalRateLimiter.reset('test-user');
  });

  describe('isAllowed', () => {
    test('allows first attempt', () => {
      const result = globalRateLimiter.isAllowed('user1', 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(4);
    });

    test('blocks after max attempts exceeded', () => {
      for (let i = 0; i < 5; i++) {
        globalRateLimiter.isAllowed('user2', 5, 60000);
      }
      const result = globalRateLimiter.isAllowed('user2', 5, 60000);
      expect(result.allowed).toBe(false);
    });

    test('tracks attempts remaining correctly', () => {
      globalRateLimiter.isAllowed('user3', 3, 60000);
      const result = globalRateLimiter.isAllowed('user3', 3, 60000);
      expect(result.attemptsRemaining).toBe(1);
    });

    test('resets attempts after window expires', async () => {
      globalRateLimiter.isAllowed('user4', 1, 100); // 100ms window
      let result = globalRateLimiter.isAllowed('user4', 1, 100);
      expect(result.allowed).toBe(false);

      await new Promise(resolve => setTimeout(resolve, 150));
      result = globalRateLimiter.isAllowed('user4', 1, 100);
      expect(result.allowed).toBe(true);
    });
  });

  describe('block/unblock', () => {
    test('blocks user temporarily', () => {
      globalRateLimiter.block('user5');
      const result = globalRateLimiter.isAllowed('user5', 5, 60000);
      expect(result.blocked).toBe(true);
      expect(result.allowed).toBe(false);
    });

    test('unblocks user', () => {
      globalRateLimiter.block('user6');
      globalRateLimiter.unblock('user6');
      const result = globalRateLimiter.isAllowed('user6', 5, 60000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    test('applies PIN_VERIFICATION strategy', () => {
      const result = checkRateLimit('user7', 'PIN_VERIFICATION');
      expect(result.allowed).toBe(true);
      expect(RateLimitStrategies.PIN_VERIFICATION.maxAttempts).toBe(3);
    });

    test('applies PAYOUT_SUBMISSION strategy', () => {
      const result = checkRateLimit('user8', 'PAYOUT_SUBMISSION');
      expect(result.allowed).toBe(true);
      expect(RateLimitStrategies.PAYOUT_SUBMISSION.maxAttempts).toBe(3);
    });

    test('rejects unknown strategy gracefully', () => {
      const result = checkRateLimit('user9', 'UNKNOWN_STRATEGY');
      expect(result.allowed).toBe(true); // Falls back to allowing
    });
  });

  describe('Rate limiting strategies', () => {
    test('PIN has 3 attempts per 5 min', () => {
      const strategy = RateLimitStrategies.PIN_VERIFICATION;
      expect(strategy.maxAttempts).toBe(3);
      expect(strategy.windowMs).toBe(300000);
    });

    test('Cross-border payout limited to 1 per day', () => {
      const strategy = RateLimitStrategies.CROSS_BORDER_PAYOUT;
      expect(strategy.maxAttempts).toBe(1);
      expect(strategy.windowMs).toBe(86400000);
    });
  });
});