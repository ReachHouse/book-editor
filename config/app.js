/**
 * =============================================================================
 * APPLICATION CONFIGURATION
 * =============================================================================
 *
 * Centralized configuration constants for the backend.
 * All magic numbers and configurable values live here.
 *
 * =============================================================================
 */

'use strict';

module.exports = {
  // Server
  PORT: parseInt(process.env.PORT, 10) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',

  // Request limits
  MAX_JSON_SIZE: '10mb',
  REQUEST_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes

  // Rate limiting
  RATE_LIMIT: {
    API: { windowMs: 15 * 60 * 1000, max: 100 },
    LOGIN: { windowMs: 15 * 60 * 1000, max: 20 },
    REGISTER: { windowMs: 15 * 60 * 1000, max: 10 },
    REFRESH: { windowMs: 15 * 60 * 1000, max: 30 },
    SETUP: { windowMs: 15 * 60 * 1000, max: 5 }
  },

  // Authentication
  AUTH: {
    BCRYPT_SALT_ROUNDS: 10,
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY_DAYS: 7,
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15
  },

  // Token limits
  TOKEN_LIMITS: {
    MAX: 100000000, // 100 million
    UNLIMITED: -1,
    RESTRICTED: 0
  },

  // Projects
  PROJECTS: {
    MAX_PER_USER: 50,
    MAX_TEXT_LENGTH: 10 * 1024 * 1024, // 10MB
    MAX_STYLE_GUIDE_LENGTH: 10000,
    MAX_CUSTOM_STYLE_GUIDE_LENGTH: 50000,
    MAX_FILE_NAME_LENGTH: 255
  },

  // API text validation
  MAX_TEXT_LENGTH: 500000,

  // Anthropic API
  ANTHROPIC: {
    API_URL: 'https://api.anthropic.com/v1/messages',
    API_VERSION: '2023-06-01',
    MODEL: 'claude-sonnet-4-20250514',
    TIMEOUT_MS: 4 * 60 * 1000, // 4 minutes
    MAX_TOKENS_EDIT: 4000,
    MAX_TOKENS_STYLE_GUIDE: 500,
    CIRCUIT_BREAKER: {
      FAILURE_THRESHOLD: 5,
      RESET_TIMEOUT_MS: 60 * 1000 // 1 minute
    }
  },

  // Session cleanup
  SESSION_CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour

  // Valid roles
  VALID_ROLES: ['admin', 'user', 'guest'],

  // Slow query threshold
  SLOW_QUERY_MS: 100
};
