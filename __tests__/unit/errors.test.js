/**
 * Tests for custom error class hierarchy.
 */

'use strict';

const {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError
} = require('../../services/errors');

describe('Error Classes', () => {
  describe('AppError', () => {
    test('has default status 500', () => {
      const err = new AppError('Something broke');
      expect(err.message).toBe('Something broke');
      expect(err.status).toBe(500);
      expect(err.name).toBe('AppError');
    });

    test('accepts custom status and code', () => {
      const err = new AppError('Custom', 418, 'TEAPOT');
      expect(err.status).toBe(418);
      expect(err.code).toBe('TEAPOT');
    });

    test('is an instance of Error', () => {
      const err = new AppError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    test('has status 400', () => {
      const err = new ValidationError('Email is required');
      expect(err.status).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.name).toBe('ValidationError');
    });

    test('has default message', () => {
      const err = new ValidationError();
      expect(err.message).toBe('Invalid input');
    });

    test('is an instance of AppError', () => {
      expect(new ValidationError()).toBeInstanceOf(AppError);
    });
  });

  describe('AuthError', () => {
    test('has status 401', () => {
      const err = new AuthError('Invalid token');
      expect(err.status).toBe(401);
      expect(err.code).toBe('AUTH_ERROR');
    });

    test('accepts custom code', () => {
      const err = new AuthError('Token expired', 'TOKEN_EXPIRED');
      expect(err.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('ForbiddenError', () => {
    test('has status 403', () => {
      const err = new ForbiddenError();
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('Access denied');
    });
  });

  describe('NotFoundError', () => {
    test('has status 404 with resource name', () => {
      const err = new NotFoundError('Project');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Project not found');
      expect(err.code).toBe('NOT_FOUND');
    });

    test('has default resource name', () => {
      const err = new NotFoundError();
      expect(err.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    test('has status 409', () => {
      const err = new ConflictError('Username taken');
      expect(err.status).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });
  });

  describe('RateLimitError', () => {
    test('has status 429', () => {
      const err = new RateLimitError('Daily limit reached');
      expect(err.status).toBe(429);
      expect(err.code).toBe('RATE_LIMITED');
    });
  });

  describe('ServiceUnavailableError', () => {
    test('has status 503', () => {
      const err = new ServiceUnavailableError('API down');
      expect(err.status).toBe(503);
      expect(err.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('error hierarchy', () => {
    test('all errors inherit from AppError', () => {
      const errors = [
        new ValidationError(),
        new AuthError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new RateLimitError(),
        new ServiceUnavailableError()
      ];

      errors.forEach(err => {
        expect(err).toBeInstanceOf(AppError);
        expect(err).toBeInstanceOf(Error);
      });
    });

    test('all errors have name matching class name', () => {
      expect(new ValidationError().name).toBe('ValidationError');
      expect(new AuthError().name).toBe('AuthError');
      expect(new ForbiddenError().name).toBe('ForbiddenError');
      expect(new NotFoundError().name).toBe('NotFoundError');
      expect(new ConflictError().name).toBe('ConflictError');
      expect(new RateLimitError().name).toBe('RateLimitError');
      expect(new ServiceUnavailableError().name).toBe('ServiceUnavailableError');
    });
  });
});
