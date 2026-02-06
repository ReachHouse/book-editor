/**
 * Tests for the structured logging service.
 */

'use strict';

describe('Logger Service', () => {
  let logger;
  let originalEnv;
  let consoleSpy;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    // Reset module cache to pick up env changes
    jest.resetModules();
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe('development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      logger = require('../../services/logger');
    });

    test('logs info messages', () => {
      logger.info('Server started');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('INFO');
      expect(call).toContain('Server started');
    });

    test('logs error messages', () => {
      logger.error('Database error');
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain('ERROR');
      expect(call).toContain('Database error');
    });

    test('logs warn messages', () => {
      logger.warn('Slow query');
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const call = consoleSpy.warn.mock.calls[0][0];
      expect(call).toContain('WARN');
      expect(call).toContain('Slow query');
    });

    test('logs debug messages in development', () => {
      logger.debug('Debug info');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('DEBUG');
    });

    test('includes metadata when provided', () => {
      logger.info('Server started', { port: 3001 });
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log.mock.calls[0][1]).toEqual({ port: 3001 });
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      logger = require('../../services/logger');
    });

    test('outputs JSON in production', () => {
      logger.info('Server started', { port: 3001 });
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const output = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Server started');
      expect(parsed.port).toBe(3001);
      expect(parsed.timestamp).toBeDefined();
    });

    test('suppresses debug messages in production', () => {
      logger.debug('Debug info');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('logs errors in production', () => {
      logger.error('Fatal error', { code: 'DB_DOWN' });
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(parsed.level).toBe('error');
      expect(parsed.code).toBe('DB_DOWN');
    });
  });
});
