/**
 * Tests for the circuit breaker in anthropicService.
 */

'use strict';

// Must mock before requiring the module
jest.mock('../../config/styleGuide', () => ({
  STYLE_GUIDE: 'Test style guide'
}));

const { _circuitBreaker: breaker } = require('../../services/anthropicService');

describe('Circuit Breaker', () => {
  beforeEach(() => {
    // Reset circuit breaker state
    breaker.state = 'CLOSED';
    breaker.failures = 0;
    breaker.lastFailureTime = null;
  });

  test('starts in CLOSED state', () => {
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.canRequest()).toBe(true);
  });

  test('stays CLOSED below failure threshold', () => {
    for (let i = 0; i < breaker.FAILURE_THRESHOLD - 1; i++) {
      breaker.onFailure();
    }
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.canRequest()).toBe(true);
  });

  test('opens after reaching failure threshold', () => {
    for (let i = 0; i < breaker.FAILURE_THRESHOLD; i++) {
      breaker.onFailure();
    }
    expect(breaker.state).toBe('OPEN');
    expect(breaker.canRequest()).toBe(false);
  });

  test('transitions to HALF_OPEN after reset timeout', () => {
    // Trip the breaker
    for (let i = 0; i < breaker.FAILURE_THRESHOLD; i++) {
      breaker.onFailure();
    }
    expect(breaker.state).toBe('OPEN');

    // Simulate time passing beyond reset timeout
    breaker.lastFailureTime = Date.now() - breaker.RESET_TIMEOUT_MS - 1;
    expect(breaker.canRequest()).toBe(true);
    expect(breaker.state).toBe('HALF_OPEN');
  });

  test('closes on success from HALF_OPEN', () => {
    breaker.state = 'HALF_OPEN';
    breaker.onSuccess();
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.failures).toBe(0);
  });

  test('reopens on failure from HALF_OPEN', () => {
    breaker.state = 'HALF_OPEN';
    breaker.onFailure();
    expect(breaker.state).toBe('OPEN');
  });

  test('resets failure count on success', () => {
    breaker.onFailure();
    breaker.onFailure();
    expect(breaker.failures).toBe(2);

    breaker.onSuccess();
    expect(breaker.failures).toBe(0);
    expect(breaker.state).toBe('CLOSED');
  });

  test('allows requests in HALF_OPEN state', () => {
    breaker.state = 'HALF_OPEN';
    expect(breaker.canRequest()).toBe(true);
  });

  test('blocks requests when OPEN and within timeout', () => {
    for (let i = 0; i < breaker.FAILURE_THRESHOLD; i++) {
      breaker.onFailure();
    }
    // Recent failure - should block
    expect(breaker.canRequest()).toBe(false);
  });
});
