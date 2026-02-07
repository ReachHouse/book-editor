/**
 * Tests for centralized application configuration.
 */

'use strict';

const config = require('../../config/app');

describe('Application Configuration', () => {
  test('exports PORT as a number', () => {
    expect(typeof config.PORT).toBe('number');
    expect(config.PORT).toBeGreaterThan(0);
  });

  test('exports rate limit configurations', () => {
    expect(config.RATE_LIMIT).toBeDefined();
    expect(config.RATE_LIMIT.API.windowMs).toBeGreaterThan(0);
    expect(config.RATE_LIMIT.API.max).toBeGreaterThan(0);
    expect(config.RATE_LIMIT.LOGIN).toBeDefined();
    expect(config.RATE_LIMIT.REGISTER).toBeDefined();
    expect(config.RATE_LIMIT.REFRESH).toBeDefined();
    expect(config.RATE_LIMIT.SETUP).toBeDefined();
  });

  test('exports auth configuration', () => {
    expect(config.AUTH.BCRYPT_SALT_ROUNDS).toBe(10);
    expect(config.AUTH.ACCESS_TOKEN_EXPIRY).toBe('15m');
    expect(config.AUTH.REFRESH_TOKEN_EXPIRY_DAYS).toBe(7);
    expect(config.AUTH.MAX_FAILED_ATTEMPTS).toBe(5);
    expect(config.AUTH.LOCKOUT_DURATION_MINUTES).toBe(15);
  });

  test('exports token limit constants', () => {
    expect(config.TOKEN_LIMITS.UNLIMITED).toBe(-1);
    expect(config.TOKEN_LIMITS.RESTRICTED).toBe(0);
    expect(config.TOKEN_LIMITS.MAX).toBeGreaterThan(0);
  });

  test('exports project limits', () => {
    expect(config.PROJECTS.MAX_PER_USER).toBe(50);
    expect(config.PROJECTS.MAX_TEXT_LENGTH).toBeGreaterThan(0);
  });

  test('exports Anthropic configuration', () => {
    expect(config.ANTHROPIC.API_URL).toContain('anthropic.com');
    expect(config.ANTHROPIC.MODEL).toContain('claude');
    expect(config.ANTHROPIC.TIMEOUT_MS).toBeGreaterThan(0);
    expect(config.ANTHROPIC.MAX_TOKENS_EDIT).toBeGreaterThan(0);
    expect(config.ANTHROPIC.CIRCUIT_BREAKER.FAILURE_THRESHOLD).toBeGreaterThan(0);
    expect(config.ANTHROPIC.CIRCUIT_BREAKER.RESET_TIMEOUT_MS).toBeGreaterThan(0);
  });

  test('exports valid roles', () => {
    expect(config.VALID_ROLES).toContain('admin');
    expect(config.VALID_ROLES).toContain('user');
    expect(config.VALID_ROLES).toContain('guest');
    expect(config.VALID_ROLES).toHaveLength(3);
  });

  test('exports slow query threshold', () => {
    expect(config.SLOW_QUERY_MS).toBe(100);
  });
});
