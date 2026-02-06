/**
 * =============================================================================
 * AUTHENTICATION ROUTES
 * =============================================================================
 *
 * Handles user registration, login, token refresh, profile retrieval,
 * and logout.
 *
 * ENDPOINTS:
 * ----------
 * POST /api/auth/register  - Create account with invite code
 * POST /api/auth/login     - Authenticate with email/username + password
 * POST /api/auth/refresh   - Exchange refresh token for new token pair
 * GET  /api/auth/me        - Get current user profile
 * POST /api/auth/logout    - Invalidate refresh token
 *
 * RATE LIMITING:
 * --------------
 * Auth endpoints use the global API rate limiter (100 req / 15 min).
 * Additionally, each endpoint has its own stricter limiter:
 * - Login:    20 req / 15 min  (brute-force mitigation)
 * - Register: 10 req / 15 min  (invite code enumeration prevention)
 * - Refresh:  30 req / 15 min  (token-spinning prevention)
 *
 * =============================================================================
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authService } = require('../services/authService');
const { requireAuth } = require('../middleware/auth');
const config = require('../config/app');

// =============================================================================
// AUTH-SPECIFIC RATE LIMITERS (values from centralized config)
// =============================================================================

const loginLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.LOGIN.windowMs,
  max: config.RATE_LIMIT.LOGIN.max,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.REGISTER.windowMs,
  max: config.RATE_LIMIT.REGISTER.max,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const refreshLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.REFRESH.windowMs,
  max: config.RATE_LIMIT.REFRESH.max,
  message: { error: 'Too many refresh attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// =============================================================================
// REGISTER
// =============================================================================

/**
 * POST /api/auth/register
 *
 * Create a new user account. Requires a valid, unused invite code.
 *
 * Request body:
 *   {
 *     username: string,    // 3-30 chars, alphanumeric + hyphens/underscores
 *     email: string,       // Valid email format
 *     password: string,    // Minimum 8 characters
 *     inviteCode: string   // Valid, unused invite code
 *   }
 *
 * Response (201):
 *   {
 *     user: { id, username, email, role, ... },
 *     accessToken: string,
 *     refreshToken: string
 *   }
 */
router.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password, inviteCode } = req.body;

    const result = await authService.register({
      username,
      email,
      password,
      inviteCode
    });

    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// =============================================================================
// LOGIN
// =============================================================================

/**
 * POST /api/auth/login
 *
 * Authenticate a user with email/username and password.
 *
 * Request body:
 *   {
 *     identifier: string,  // Email or username
 *     password: string
 *   }
 *
 * Response (200):
 *   {
 *     user: { id, username, email, role, ... },
 *     accessToken: string,
 *     refreshToken: string
 *   }
 */
router.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const result = await authService.login({ identifier, password });

    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// =============================================================================
// REFRESH TOKEN
// =============================================================================

/**
 * POST /api/auth/refresh
 *
 * Exchange a valid refresh token for a new access + refresh token pair.
 * Implements token rotation — the old refresh token is invalidated.
 *
 * Request body:
 *   { refreshToken: string }
 *
 * Response (200):
 *   {
 *     user: { id, username, email, role, ... },
 *     accessToken: string,
 *     refreshToken: string
 *   }
 */
router.post('/api/auth/refresh', refreshLimiter, (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = authService.refreshToken(refreshToken);

    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// =============================================================================
// GET PROFILE
// =============================================================================

/**
 * GET /api/auth/me
 *
 * Get the authenticated user's profile.
 * Requires a valid access token in the Authorization header.
 *
 * Response (200):
 *   { id, username, email, role, created_at, last_login_at, ... }
 */
router.get('/api/auth/me', requireAuth, (req, res) => {
  const user = authService.getProfile(req.user.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// =============================================================================
// LOGOUT
// =============================================================================

/**
 * POST /api/auth/logout
 *
 * Invalidate the provided refresh token, ending the session.
 *
 * Request body:
 *   { refreshToken: string }
 *
 * Response (200):
 *   { message: 'Logged out successfully' }
 */
router.post('/api/auth/logout', (req, res) => {
  const { refreshToken } = req.body;
  // Validate input - logout should have a token to invalidate
  if (!refreshToken || typeof refreshToken !== 'string') {
    // Still return success - no need to reveal whether token existed
    return res.json({ message: 'Logged out successfully' });
  }
  authService.logout(refreshToken);
  res.json({ message: 'Logged out successfully' });
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = router;
