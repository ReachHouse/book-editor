/**
 * =============================================================================
 * ADMIN ROUTES - User & Invite Code Management
 * =============================================================================
 *
 * Admin-only endpoints for managing users and invite codes.
 * All endpoints require admin role (requireAdmin middleware).
 *
 * ENDPOINTS:
 * ----------
 * GET    /api/admin/users            - List all users with usage
 * PUT    /api/admin/users/:id        - Update user (role, limits, active)
 * DELETE /api/admin/users/:id        - Delete a user
 * GET    /api/admin/invite-codes     - List all invite codes
 * POST   /api/admin/invite-codes     - Generate a new invite code
 *
 * =============================================================================
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { database } = require('../services/database');

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * GET /api/admin/users
 *
 * List all users with their current usage data.
 * Returns sanitized user objects (no password hashes).
 *
 * Response: { users: [...] }
 */
router.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const allUsers = database.users.listAll();

    const users = allUsers.map(user => {
      const daily = database.usageLogs.getDailyUsage(user.id);
      const monthly = database.usageLogs.getMonthlyUsage(user.id);
      const projectCount = database.projects.count(user.id);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.is_active === 1,
        dailyTokenLimit: user.daily_token_limit,
        monthlyTokenLimit: user.monthly_token_limit,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        projectCount,
        daily: {
          total: daily.total,
          limit: user.daily_token_limit,
          percentage: user.daily_token_limit > 0
            ? Math.min(100, Math.round((daily.total / user.daily_token_limit) * 100))
            : 0
        },
        monthly: {
          total: monthly.total,
          limit: user.monthly_token_limit,
          percentage: user.monthly_token_limit > 0
            ? Math.min(100, Math.round((monthly.total / user.monthly_token_limit) * 100))
            : 0
        }
      };
    });

    res.json({ users });
  } catch (err) {
    console.error('Admin list users error:', err.message);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

/**
 * PUT /api/admin/users/:id
 *
 * Update a user's role, active status, or token limits.
 * Admins cannot deactivate or demote themselves.
 *
 * Request body (all optional):
 *   {
 *     role?: 'admin' | 'user',
 *     isActive?: boolean,
 *     dailyTokenLimit?: number,
 *     monthlyTokenLimit?: number
 *   }
 *
 * Response: { user: {...} }
 */
router.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const targetUser = database.users.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { role, isActive, dailyTokenLimit, monthlyTokenLimit } = req.body;
    const isSelf = req.user.userId === targetId;

    // Prevent admins from demoting or deactivating themselves
    if (isSelf) {
      if (role !== undefined && role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }
      if (isActive !== undefined && !isActive) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
    }

    // Build update fields
    const fields = {};

    if (role !== undefined) {
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Role must be "admin" or "user"' });
      }
      fields.role = role;
    }

    if (isActive !== undefined) {
      fields.is_active = isActive ? 1 : 0;
    }

    if (dailyTokenLimit !== undefined) {
      const limit = parseInt(dailyTokenLimit, 10);
      if (isNaN(limit) || limit < 0) {
        return res.status(400).json({ error: 'Daily token limit must be a non-negative number' });
      }
      fields.daily_token_limit = limit;
    }

    if (monthlyTokenLimit !== undefined) {
      const limit = parseInt(monthlyTokenLimit, 10);
      if (isNaN(limit) || limit < 0) {
        return res.status(400).json({ error: 'Monthly token limit must be a non-negative number' });
      }
      fields.monthly_token_limit = limit;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = database.users.update(targetId, fields);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update user' });
    }

    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        isActive: updated.is_active === 1,
        dailyTokenLimit: updated.daily_token_limit,
        monthlyTokenLimit: updated.monthly_token_limit,
        createdAt: updated.created_at,
        lastLoginAt: updated.last_login_at
      }
    });
  } catch (err) {
    console.error('Admin update user error:', err.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 *
 * Delete a user and all their data (projects, sessions, usage logs).
 * Admins cannot delete themselves.
 *
 * Response: { success: true }
 */
router.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (req.user.userId === targetId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const targetUser = database.users.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    database.users.delete(targetId);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// =============================================================================
// INVITE CODE MANAGEMENT
// =============================================================================

/**
 * GET /api/admin/invite-codes
 *
 * List all invite codes with usage info.
 *
 * Response: { codes: [...] }
 */
router.get('/api/admin/invite-codes', requireAdmin, (req, res) => {
  try {
    const allCodes = database.inviteCodes.listAll();

    const codes = allCodes.map(code => {
      // Look up creator and consumer usernames
      const creator = code.created_by ? database.users.findById(code.created_by) : null;
      const consumer = code.used_by ? database.users.findById(code.used_by) : null;

      return {
        id: code.id,
        code: code.code,
        isUsed: code.is_used === 1,
        createdBy: creator ? creator.username : null,
        usedBy: consumer ? consumer.username : null,
        createdAt: code.created_at,
        usedAt: code.used_at
      };
    });

    res.json({ codes });
  } catch (err) {
    console.error('Admin list invite codes error:', err.message);
    res.status(500).json({ error: 'Failed to load invite codes' });
  }
});

/**
 * POST /api/admin/invite-codes
 *
 * Generate a new invite code.
 *
 * Response: { code: {...} }
 */
router.post('/api/admin/invite-codes', requireAdmin, (req, res) => {
  try {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    const created = database.inviteCodes.create(code, req.user.userId);

    res.json({
      code: {
        id: created.id,
        code: created.code,
        isUsed: false,
        createdBy: req.user.username,
        createdAt: created.created_at
      }
    });
  } catch (err) {
    console.error('Admin create invite code error:', err.message);
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

module.exports = router;
