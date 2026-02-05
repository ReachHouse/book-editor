/**
 * =============================================================================
 * FIRST-RUN SETUP ROUTES
 * =============================================================================
 *
 * Provides a secure first-time setup wizard for creating the initial admin
 * account. These endpoints ONLY work when the database has zero users.
 *
 * SECURITY MEASURES:
 * ------------------
 * 1. Endpoints disabled once any user exists (checked on every request)
 * 2. Uses database transaction for atomic user creation
 * 3. Applies same validation as regular registration (username, email, password)
 * 4. Passwords hashed with bcrypt before storage
 * 5. No sensitive data leaked in responses
 * 6. Setup completion logged for audit trail
 *
 * ENDPOINTS:
 * ----------
 * GET  /api/setup/status   - Check if first-time setup is needed
 * POST /api/setup/complete - Create the first admin account
 *
 * =============================================================================
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { database } = require('../services/database');

// Bcrypt cost factor (matches authService.js: 10 = ~100ms on modern hardware)
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Check if setup is needed (no users exist).
 * This is called on every request to verify setup state.
 *
 * @returns {boolean} True if database has zero users
 */
function isSetupRequired() {
  const count = database.users.count();
  return count === 0;
}

/**
 * Validate username format and length.
 * Must be 3-30 characters, alphanumeric with hyphens/underscores.
 *
 * @param {string} username
 * @returns {{ valid: boolean, error?: string }}
 */
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

/**
 * Validate email format and length.
 * RFC 5321 specifies max 254 characters.
 *
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
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

/**
 * Validate password strength.
 * Requires: 8+ chars, uppercase, lowercase, number.
 *
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
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

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/setup/status
 *
 * Check if first-time setup is required.
 * Returns { needsSetup: true } if no users exist.
 *
 * Response: { needsSetup: boolean }
 */
router.get('/api/setup/status', (req, res) => {
  try {
    const needsSetup = isSetupRequired();
    res.json({ needsSetup });
  } catch (err) {
    console.error('Setup status check error:', err.message);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

/**
 * POST /api/setup/complete
 *
 * Create the first admin account. This endpoint ONLY works when
 * the database has zero users. Once any user exists, this returns 403.
 *
 * Request body:
 *   {
 *     username: string,  // 3-30 chars, alphanumeric/-/_
 *     email: string,     // valid email, max 254 chars
 *     password: string   // 8+ chars, uppercase, lowercase, number
 *   }
 *
 * Response: { success: true, message: string }
 *
 * Errors:
 *   400 - Validation failed
 *   403 - Setup already completed (users exist)
 *   500 - Server error
 */
router.post('/api/setup/complete', async (req, res) => {
  try {
    // SECURITY: Check setup is still required before proceeding
    // This prevents race conditions where setup completes between page load and submit
    if (!isSetupRequired()) {
      console.warn('Setup attempt blocked: users already exist');
      return res.status(403).json({
        error: 'Setup already completed',
        message: 'An admin account already exists. Please use the login page.'
      });
    }

    const { username, email, password } = req.body;

    // Validate all inputs
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

    // Hash password before database transaction
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create admin user in a transaction for atomicity
    // Double-check user count inside transaction to prevent race conditions
    const result = database.transaction(() => {
      // SECURITY: Re-verify no users exist inside the transaction
      const currentCount = database.users.count();
      if (currentCount > 0) {
        throw Object.assign(new Error('Setup already completed'), { status: 403 });
      }

      // Create the admin user
      const adminUser = database.users.create({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: 'admin'
      });

      return adminUser;
    });

    // Log successful setup for audit trail
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FIRST-TIME SETUP COMPLETED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Admin account created: ${result.username}`);
    console.log(`Email: ${result.email}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════');

    res.json({
      success: true,
      message: 'Admin account created successfully. You can now log in.'
    });

  } catch (err) {
    // Handle known errors with appropriate status codes
    if (err.status === 403) {
      return res.status(403).json({
        error: 'Setup already completed',
        message: 'An admin account already exists. Please use the login page.'
      });
    }

    console.error('Setup completion error:', err.message);
    res.status(500).json({ error: 'Failed to complete setup. Please try again.' });
  }
});

module.exports = router;
