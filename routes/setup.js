/**
 * First-Run Setup Routes — Initial admin account creation.
 * Only works when the database has zero users and a valid SETUP_SECRET is provided.
 *
 * GET  /api/setup/status   - Check if first-time setup is needed
 * POST /api/setup/complete - Create the first admin account
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { database } = require('../services/database');
const config = require('../config/app');
const logger = require('../services/logger');

const BCRYPT_SALT_ROUNDS = config.AUTH.BCRYPT_SALT_ROUNDS;

const setupLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.SETUP.windowMs,
  max: config.RATE_LIMIT.SETUP.max,
  message: { error: 'Too many setup attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/** Check if setup is needed (no users exist). */
function isSetupRequired() {
  const count = database.users.count();
  return count === 0;
}

/** Validate the setup secret against the SETUP_SECRET env var. */
function validateSetupSecret(providedSecret) {
  const envSecret = process.env.SETUP_SECRET;

  if (!envSecret) {
    return {
      valid: false,
      error: 'Setup is disabled. SETUP_SECRET environment variable not configured.'
    };
  }

  if (!providedSecret || typeof providedSecret !== 'string') {
    return { valid: false, error: 'Setup secret is required' };
  }

  // Constant-time comparison to prevent timing attacks
  const secretBuffer = Buffer.from(envSecret);
  const providedBuffer = Buffer.from(providedSecret);

  if (secretBuffer.length !== providedBuffer.length) {
    return { valid: false, error: 'Invalid setup secret' };
  }

  const crypto = require('crypto');
  if (!crypto.timingSafeEqual(secretBuffer, providedBuffer)) {
    return { valid: false, error: 'Invalid setup secret' };
  }

  return { valid: true };
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { valid: false, error: 'Username must be 3-30 characters' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username may only contain letters, numbers, hyphens, and underscores' };
  }
  return { valid: true };
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address too long (max 254 characters)' };
  }
  return { valid: true };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// --- Routes ---

/** GET /api/setup/status — Check if first-time setup is required. */
router.get('/api/setup/status', (req, res) => {
  try {
    const needsSetup = isSetupRequired();
    const setupEnabled = !!process.env.SETUP_SECRET;
    res.json({ needsSetup, setupEnabled });
  } catch (err) {
    logger.error('Setup status check error', { error: err.message });
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

/**
 * POST /api/setup/complete
 * Create the first admin account. Requires zero existing users and valid setup_secret.
 */
router.post('/api/setup/complete', setupLimiter, async (req, res) => {
  try {
    if (!isSetupRequired()) {
      logger.warn('Setup attempt blocked: users already exist');
      return res.status(403).json({
        error: 'Setup already completed',
        message: 'An admin account already exists. Please use the login page.'
      });
    }

    const { username, email, password, setup_secret } = req.body;

    // Validate setup secret first
    const secretCheck = validateSetupSecret(setup_secret);
    if (!secretCheck.valid) {
      logger.warn('Setup attempt blocked: invalid setup secret');
      return res.status(403).json({ error: secretCheck.error });
    }

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return res.status(400).json({ error: usernameCheck.error });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.error });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Double-check inside transaction to prevent race conditions
    const result = database.transaction(() => {
      const currentCount = database.users.count();
      if (currentCount > 0) {
        throw Object.assign(new Error('Setup already completed'), { status: 403 });
      }

      return database.users.create({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: 'admin'
      });
    });

    logger.info('First-time setup completed', {
      username: result.username,
      email: result.email
    });

    res.json({
      success: true,
      message: 'Admin account created successfully. You can now log in.'
    });

  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({
        error: 'Setup already completed',
        message: 'An admin account already exists. Please use the login page.'
      });
    }

    logger.error('Setup completion error', { error: err.message });
    res.status(500).json({ error: 'Failed to complete setup. Please try again.' });
  }
});

module.exports = router;
