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
 * Login additionally has its own stricter limiter (20 req / 15 min)
 * to mitigate brute-force attempts.
 *
 * =============================================================================
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authService } = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

// =============================================================================
// AUTH-SPECIFIC RATE LIMITERS
// =============================================================================

/**
 * Stricter rate limit for login attempts to prevent brute-force attacks.
 * 20 attempts per 15-minute window per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limit for registration to prevent invite code enumeration.
 * 10 attempts per 15-minute window per IP.
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts. Please try again later.' },
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
router.post('/api/auth/refresh', (req, res) => {
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
  authService.logout(refreshToken);
  res.json({ message: 'Logged out successfully' });
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = router;
