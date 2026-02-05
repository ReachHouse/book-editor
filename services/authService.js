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

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Number of bcrypt salt rounds (10 = ~100ms on modern hardware) */
const BCRYPT_SALT_ROUNDS = 10;

/** Access token lifetime (15 minutes) */
const ACCESS_TOKEN_EXPIRY = '15m';

/** Refresh token lifetime (7 days) */
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/** Maximum failed login attempts before lockout */
const MAX_FAILED_ATTEMPTS = 5;

/** Lockout duration in minutes */
const LOCKOUT_DURATION_MINUTES = 15;

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
    console.warn('  WARNING: No JWT_SECRET set. Generated random secret (tokens will not survive restart).');
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
  // Handle v1.25.0 seed format: "plain:actualPassword"
  if (hash.startsWith('plain:')) {
    return password === hash.substring(6);
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
      throw Object.assign(new Error('All fields are required'), { status: 400 });
    }

    if (username.length < 3 || username.length > 30) {
      throw Object.assign(new Error('Username must be 3–30 characters'), { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw Object.assign(new Error('Username may only contain letters, numbers, hyphens, and underscores'), { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Invalid email format'), { status: 400 });
    }

    if (password.length < 8) {
      throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
    }

    // Hash password before entering the transaction (bcrypt is async)
    const passwordHash = await hashPassword(password);

    // All checks and writes run inside a single transaction to prevent
    // race conditions (e.g., two concurrent requests using the same invite code).
    const user = database.transaction(() => {
      // Check invite code validity
      if (!database.inviteCodes.isValid(inviteCode)) {
        throw Object.assign(new Error('Invalid or already used invite code'), { status: 400 });
      }

      // Check for existing users with same email or username
      const existingEmail = database.users.findByEmail(email);
      if (existingEmail) {
        throw Object.assign(new Error('Email already registered'), { status: 409 });
      }

      const existingUsername = database.users.findByUsername(username);
      if (existingUsername) {
        throw Object.assign(new Error('Username already taken'), { status: 409 });
      }

      const newUser = database.users.create({
        username,
        email,
        password_hash: passwordHash,
        role: 'user'
      });

      // Mark invite code as used and verify it succeeded
      const marked = database.inviteCodes.markUsed(inviteCode, newUser.id);
      if (!marked) {
        throw Object.assign(new Error('Failed to use invite code'), { status: 500 });
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
      throw Object.assign(new Error('Email/username and password are required'), { status: 400 });
    }

    // Find user by email or username
    const user = database.users.findByEmailOrUsername(identifier);
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    // Check if account is active
    if (!user.is_active) {
      throw Object.assign(new Error('Account is deactivated'), { status: 403 });
    }

    // Check lockout
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until);
      if (lockExpiry > new Date()) {
        const minutesLeft = Math.ceil((lockExpiry - new Date()) / 60000);
        throw Object.assign(
          new Error(`Account locked. Try again in ${minutesLeft} minute(s).`),
          { status: 429 }
        );
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
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
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
      throw Object.assign(new Error('Refresh token is required'), { status: 400 });
    }

    // Look up the session
    const session = database.sessions.findByToken(refreshToken);
    if (!session) {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      database.sessions.deleteByToken(refreshToken);
      throw Object.assign(new Error('Refresh token expired'), { status: 401 });
    }

    // Look up the user
    const user = database.users.findById(session.user_id);
    if (!user || !user.is_active) {
      database.sessions.deleteByToken(refreshToken);
      throw Object.assign(new Error('User not found or deactivated'), { status: 401 });
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
