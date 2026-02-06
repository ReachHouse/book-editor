/**
 * =============================================================================
 * CUSTOM ERROR CLASSES
 * =============================================================================
 *
 * Provides a hierarchy of typed errors for consistent error handling
 * across the application.
 *
 * USAGE:
 * ------
 * const { ValidationError, AuthError, NotFoundError } = require('./services/errors');
 *
 * throw new ValidationError('Email is required');
 * throw new AuthError('Invalid credentials');
 * throw new NotFoundError('User');
 * throw new RateLimitError('Daily token limit reached');
 * throw new ServiceUnavailableError('Claude API is temporarily unavailable');
 *
 * ERROR HANDLING IN ROUTES:
 * -------------------------
 * catch (err) {
 *   if (err instanceof AppError) {
 *     return res.status(err.status).json({ error: err.message });
 *   }
 *   // Unknown error — log and return 500
 * }
 *
 * =============================================================================
 */

'use strict';

/**
 * Base application error with HTTP status code.
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {string} [code] - Machine-readable error code
   */
  constructor(message, status = 500, code) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

/**
 * 400 Bad Request — invalid input or validation failure.
 */
class ValidationError extends AppError {
  constructor(message = 'Invalid input') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * 401 Unauthorized — authentication failed.
 */
class AuthError extends AppError {
  constructor(message = 'Authentication failed', code = 'AUTH_ERROR') {
    super(message, 401, code);
  }
}

/**
 * 403 Forbidden — insufficient permissions.
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found — resource does not exist.
 */
class NotFoundError extends AppError {
  /**
   * @param {string} resource - Name of the resource (e.g., 'User', 'Project')
   */
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict — resource already exists.
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 429 Too Many Requests — rate limit exceeded.
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMITED');
  }
}

/**
 * 503 Service Unavailable — external service is down.
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError
};
