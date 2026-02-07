/**
 * =============================================================================
 * AUTHENTICATION MIDDLEWARE
 * =============================================================================
 *
 * Express middleware for JWT-based route protection.
 *
 * MIDDLEWARE FUNCTIONS:
 * --------------------
 * - requireAuth:  Verifies JWT access token, attaches req.user
 * - requireAdmin: Verifies JWT + ensures user has 'admin' role
 * - optionalAuth: Attaches req.user if token present, continues if not
 *
 * USAGE:
 * ------
 * const { requireAuth, requireAdmin } = require('../middleware/auth');
 *
 * // Protect a route (any authenticated user)
 * router.post('/api/edit-chunk', requireAuth, (req, res) => {
 *   console.log(req.user); // { userId, username, role }
 * });
 *
 * // Admin-only route
 * router.get('/api/admin/users', requireAdmin, handler);
 *
 * TOKEN FORMAT:
 * -------------
 * Authorization: Bearer <jwt-access-token>
 *
 * =============================================================================
 */

'use strict';

const { verifyAccessToken } = require('../services/authService');
const { database } = require('../services/database');
const logger = require('../services/logger');

/**
 * Extract Bearer token from Authorization header.
 *
 * @param {import('express').Request} req - Express request
 * @returns {string|null} The token string or null if not present
 */
function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.substring(7);
}

/**
 * Middleware: Require a valid JWT access token.
 *
 * On success, attaches the decoded token payload to req.user:
 *   { userId: number, username: string, role: string }
 *
 * On failure, returns 401 Unauthorized.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Step 1: Verify token (separate from database operations)
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Step 2: Verify user exists and is active (database operation)
  try {
    const user = database.users.findById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    // Attach user data to request — use DB role (not JWT role) so that
    // role changes (e.g., admin demotes a user) take effect immediately
    // instead of waiting for the 15-minute access token to expire.
    req.user = {
      userId: decoded.userId,
      username: user.username,
      role: user.role
    };

    next();
  } catch (err) {
    // Database error - log and return 500 (not 401)
    logger.error('Database error in requireAuth', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware: Require a valid JWT with admin role.
 *
 * Runs requireAuth first, then checks for admin role.
 * Returns 403 Forbidden if the user is not an admin.
 */
function requireAdmin(req, res, next) {
  // First verify auth, then check admin role.
  // If requireAuth rejects (sends 401), the callback is never called.
  // requireAuth only calls next() on success, at which point req.user is set.
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Middleware: Optionally attach user if token is present.
 *
 * Does NOT reject requests without tokens — just sets req.user to null.
 * Useful for endpoints that work for both authenticated and anonymous users.
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  // Step 1: Verify token
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    // Invalid/expired token - treat as unauthenticated
    req.user = null;
    return next();
  }

  // Step 2: Verify user exists and is active
  try {
    const user = database.users.findById(decoded.userId);

    if (user && user.is_active) {
      req.user = {
        userId: decoded.userId,
        username: user.username,
        role: user.role
      };
    } else {
      req.user = null;
    }
  } catch (err) {
    // Database error - log but continue as unauthenticated
    logger.error('Database error in optionalAuth', { error: err.message });
    req.user = null;
  }

  next();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  extractToken
};
