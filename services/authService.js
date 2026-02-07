/**
 * =============================================================================
 * AUTHENTICATION SERVICE
 * =============================================================================
 *
 * Handles password hashing, JWT token generation/verification, and user
 * authentication logic (register, login, token refresh).
 *
 * SECURITY DESIGN:
 * ----------------
 * - Passwords hashed with bcrypt (10 salt rounds)
 * - Access tokens: Short-lived JWTs (15 minutes)
 * - Refresh tokens: Longer-lived, stored in sessions table (7 days)
 * - Account lockout after 5 failed login attempts (15-minute cooldown)
 * - Registration requires a valid, unused invite code
 * - Admin seeds with plain-text marker are re-hashed on first login
 *
 * USAGE:
 * ------
 * const { authService } = require('./services/authService');
 *
 * // Register a new user
 * const result = await authService.register({ username, email, password, inviteCode });
 *
 * // Login
 * const result = await authService.login({ identifier, password });
 *
 * // Refresh tokens
 * const result = await authService.refreshToken(refreshToken);
 *
 * // Logout
 * authService.logout(refreshToken);
 *
 * =============================================================================
 */

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { database } = require('./database');
const config = require('../config/app');
const logger = require('./logger');
const { AppError, ValidationError, AuthError, ConflictError, RateLimitError } = require('./errors');

// =============================================================================
// CONFIGURATION (from centralized config)
// =============================================================================

const BCRYPT_SALT_ROUNDS = config.AUTH.BCRYPT_SALT_ROUNDS;
const ACCESS_TOKEN_EXPIRY = config.AUTH.ACCESS_TOKEN_EXPIRY;
const REFRESH_TOKEN_EXPIRY_DAYS = config.AUTH.REFRESH_TOKEN_EXPIRY_DAYS;
const MAX_FAILED_ATTEMPTS = config.AUTH.MAX_FAILED_ATTEMPTS;
const LOCKOUT_DURATION_MINUTES = config.AUTH.LOCKOUT_DURATION_MINUTES;

/**
 * Get the JWT secret from environment or generate a fallback.
 * A generated fallback means tokens won't survive server restarts.
 *
 * @returns {string} The JWT signing secret
 */
function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  // Generate a random secret if none provided — tokens won't persist across restarts.
  // This is acceptable for development but not production.
  if (!getJwtSecret._fallback) {
    getJwtSecret._fallback = crypto.randomBytes(64).toString('hex');
    logger.warn('No JWT_SECRET set - generated random secret (tokens will not survive restart)');
  }
  return getJwtSecret._fallback;
}

// =============================================================================
// PASSWORD UTILITIES
// =============================================================================

/**
 * Hash a plaintext password with bcrypt.
 *
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Bcrypt hash
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * Also handles the v1.25.0 plain-text marker format (plain:xxx).
 *
 * @param {string} password - Plaintext password to check
 * @param {string} hash - Stored hash (bcrypt or plain:xxx)
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  if (!hash) return false;
  // Handle v1.25.0 seed format: "plain:actualPassword"
  if (hash.startsWith('plain:')) {
    const stored = hash.substring(6);
    const passwordBuf = Buffer.from(password);
    const storedBuf = Buffer.from(stored);
    if (passwordBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(passwordBuf, storedBuf);
  }
  return bcrypt.compare(password, hash);
}

// =============================================================================
// TOKEN UTILITIES
// =============================================================================

/**
 * Generate a JWT access token for the given user.
 *
 * @param {Object} user - User record from database
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a cryptographically random refresh token and store it as a session.
 *
 * @param {number} userId - User ID to associate with the session
 * @returns {string} The refresh token string
 */
function generateRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');

  // Calculate expiry date in SQLite-compatible format (YYYY-MM-DD HH:MM:SS)
  // so that deleteExpired() comparisons with datetime('now') work correctly.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  const sqliteExpiry = expiresAt.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  // Store in sessions table
  database.sessions.create(userId, token, sqliteExpiry);

  return token;
}

/**
 * Verify and decode a JWT access token.
 *
 * @param {string} token - JWT access token
 * @returns {{ userId: number, username: string, role: string }} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

// =============================================================================
// AUTH SERVICE
// =============================================================================

const authService = {
  /**
   * Register a new user account.
   *
   * Requires a valid, unused invite code. The code is marked as used upon
   * successful registration.
   *
   * @param {Object} data - Registration data
   * @param {string} data.username - Desired username
   * @param {string} data.email - Email address
   * @param {string} data.password - Plaintext password
   * @param {string} data.inviteCode - Valid invite code
   * @returns {Promise<{ user: Object, accessToken: string, refreshToken: string }>}
   * @throws {Error} If validation fails or invite code is invalid
   */
  async register({ username, email, password, inviteCode }) {
    // Validate inputs
    if (!username || !email || !password || !inviteCode) {
      throw new ValidationError('All fields are required');
    }

    // Normalize inputs (trim whitespace, lowercase email)
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedInviteCode = inviteCode.trim().toUpperCase();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      throw new ValidationError('Username must be 3–30 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedUsername)) {
      throw new ValidationError('Username may only contain letters, numbers, hyphens, and underscores');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    // RFC 5321 specifies max 254 characters for email addresses
    if (normalizedEmail.length > 254) {
      throw new ValidationError('Email address too long (max 254 characters)');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Require password complexity: uppercase, lowercase, and number
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }

    // Hash password before entering the transaction (bcrypt is async)
    const passwordHash = await hashPassword(password);

    // All checks and writes run inside a single transaction to prevent
    // race conditions (e.g., two concurrent requests using the same invite code).
    const user = database.transaction(() => {
      // Check invite code validity
      if (!database.inviteCodes.isValid(normalizedInviteCode)) {
        throw new ValidationError('Invalid or already used invite code');
      }

      // Check for existing users with same email or username
      // SECURITY: Use generic error message to prevent user enumeration
      const existingEmail = database.users.findByEmail(normalizedEmail);
      const existingUsername = database.users.findByUsername(normalizedUsername);
      if (existingEmail || existingUsername) {
        throw new ConflictError('An account with this email or username already exists');
      }

      // Get role defaults for 'user' (the default role for new users)
      const roleDefaults = database.roleDefaults.get('user');
      const newUser = database.users.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: 'user',
        daily_token_limit: roleDefaults?.daily_token_limit ?? config.TOKEN_LIMITS.DEFAULT_DAILY,
        monthly_token_limit: roleDefaults?.monthly_token_limit ?? config.TOKEN_LIMITS.DEFAULT_MONTHLY
      });

      // Mark invite code as used and verify it succeeded
      const marked = database.inviteCodes.markUsed(normalizedInviteCode, newUser.id);
      if (!marked) {
        throw new AppError('Failed to use invite code', 500);
      }

      return newUser;
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken
    };
  },

  /**
   * Authenticate a user with email/username and password.
   *
   * Handles:
   * - Account lockout after MAX_FAILED_ATTEMPTS failures
   * - Re-hashing v1.25.0 plain-text admin passwords on first login
   * - Updating last_login_at timestamp
   *
   * @param {Object} data - Login credentials
   * @param {string} data.identifier - Email or username
   * @param {string} data.password - Plaintext password
   * @returns {Promise<{ user: Object, accessToken: string, refreshToken: string }>}
   * @throws {Error} If credentials are invalid or account is locked
   */
  async login({ identifier, password }) {
    if (!identifier || !password) {
      throw new ValidationError('Email/username and password are required');
    }

    // Find user by email or username
    const user = database.users.findByEmailOrUsername(identifier);
    if (!user) {
      throw new AuthError('Invalid credentials');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new AppError('Account is deactivated', 403);
    }

    // Check lockout
    if (user.locked_until) {
      const now = new Date();
      const lockExpiry = new Date(user.locked_until);
      if (lockExpiry > now) {
        const minutesLeft = Math.ceil((lockExpiry - now) / 60000);
        throw new RateLimitError(`Account locked. Try again in ${minutesLeft} minute(s).`);
      }
      // Lock has expired — clear it
      database.users.update(user.id, { failed_login_attempts: 0, locked_until: null });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
        updates.locked_until = lockUntil.toISOString();
      }

      database.users.update(user.id, updates);
      throw new AuthError('Invalid credentials');
    }

    // Successful login — re-hash plain-text password if needed (v1.25.0 seed)
    if (user.password_hash.startsWith('plain:')) {
      const newHash = await hashPassword(password);
      database.users.update(user.id, { password_hash: newHash });
    }

    // Reset failed attempts and update last login
    const freshUser = database.users.update(user.id, {
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString()
    });

    // Generate tokens using the fresh user data (not the stale pre-update copy)
    const accessToken = generateAccessToken(freshUser);
    const refreshToken = generateRefreshToken(freshUser.id);

    return {
      user: sanitizeUser(freshUser),
      accessToken,
      refreshToken
    };
  },

  /**
   * Refresh an access token using a valid refresh token.
   *
   * The old refresh token is deleted and a new one is issued (token rotation)
   * to limit the damage of a leaked refresh token.
   *
   * @param {string} refreshToken - The refresh token to exchange
   * @returns {{ user: Object, accessToken: string, refreshToken: string }}
   * @throws {Error} If refresh token is invalid or expired
   */
  refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Look up the session
    const session = database.sessions.findByToken(refreshToken);
    if (!session) {
      throw new AuthError('Invalid refresh token');
    }

    // Check expiry (use consistent timestamp to avoid race conditions)
    const now = new Date();
    if (new Date(session.expires_at) < now) {
      database.sessions.deleteByToken(refreshToken);
      throw new AuthError('Refresh token expired');
    }

    // Look up the user
    const user = database.users.findById(session.user_id);
    if (!user || !user.is_active) {
      database.sessions.deleteByToken(refreshToken);
      throw new AuthError('User not found or deactivated');
    }

    // Token rotation: delete old, create new
    database.sessions.deleteByToken(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    return {
      user: sanitizeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  },

  /**
   * Logout by invalidating the refresh token.
   *
   * @param {string} refreshToken - The refresh token to revoke
   */
  logout(refreshToken) {
    if (refreshToken) {
      database.sessions.deleteByToken(refreshToken);
    }
  },

  /**
   * Get a user's profile (excluding sensitive fields).
   *
   * @param {number} userId - User ID
   * @returns {Object|null} Sanitized user object or null
   */
  getProfile(userId) {
    const user = database.users.findById(userId);
    if (!user) return null;
    return sanitizeUser(user);
  }
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Remove sensitive fields from a user object before sending to the client.
 *
 * @param {Object} user - Raw user record from database
 * @returns {Object} User without password_hash, locked_until, failed_login_attempts
 */
function sanitizeUser(user) {
  const {
    password_hash,
    failed_login_attempts,
    locked_until,
    ...safe
  } = user;
  return safe;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  authService,
  // Exported for testing
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  getJwtSecret
};
