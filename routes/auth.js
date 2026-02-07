/**
 * Authentication Routes — Registration, login, token refresh, and logout.
 *
 * POST /api/auth/register - Create account with invite code
 * POST /api/auth/login    - Authenticate with email/username + password
 * POST /api/auth/refresh  - Exchange refresh token for new token pair
 * GET  /api/auth/me       - Get current user profile
 * POST /api/auth/logout   - Invalidate refresh token
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authService } = require('../services/authService');
const { requireAuth } = require('../middleware/auth');
const config = require('../config/app');
const logger = require('../services/logger');

// Auth-specific rate limiters
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

// --- Routes ---

/** POST /api/auth/register — Create a new user account with invite code. */
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
    if (status >= 500) logger.error('Registration error', { error: err.message });
    res.status(status).json({ error: err.message });
  }
});

/** POST /api/auth/login — Authenticate with email/username and password. */
router.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const result = await authService.login({ identifier, password });

    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) logger.error('Login error', { error: err.message });
    else if (status === 401) logger.warn('Failed login attempt', { identifier: req.body?.identifier });
    res.status(status).json({ error: err.message });
  }
});

/** POST /api/auth/refresh — Exchange refresh token for a new token pair (rotation). */
router.post('/api/auth/refresh', refreshLimiter, (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = authService.refreshToken(refreshToken);

    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) logger.error('Token refresh error', { error: err.message });
    res.status(status).json({ error: err.message });
  }
});

/** GET /api/auth/me — Get the authenticated user's profile. */
router.get('/api/auth/me', requireAuth, (req, res) => {
  const user = authService.getProfile(req.user.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

/** POST /api/auth/logout — Invalidate the provided refresh token. */
router.post('/api/auth/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.json({ message: 'Logged out successfully' });
  }
  authService.logout(refreshToken);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
