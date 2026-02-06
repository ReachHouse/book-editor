/**
 * =============================================================================
 * ADMIN ROUTES - User, Role & Invite Code Management
 * =============================================================================
 *
 * Admin-only endpoints for managing users, roles, and invite codes.
 * All endpoints require admin role (requireAdmin middleware).
 *
 * ENDPOINTS:
 * ----------
 * GET    /api/admin/users            - List all users with usage
 * PUT    /api/admin/users/:id        - Update user (role, limits, active)
 * DELETE /api/admin/users/:id        - Delete a user
 * GET    /api/admin/invite-codes     - List all invite codes
 * POST   /api/admin/invite-codes     - Generate a new invite code
 * DELETE /api/admin/invite-codes/:id - Delete an unused invite code
 * GET    /api/admin/role-defaults    - List default limits for all roles
 * PUT    /api/admin/role-defaults/:role - Update default limits for a role
 *
 * ROLES:
 * ------
 * - admin: Full access, unlimited tokens (-1)
 * - user:  Standard access, 500K daily / 10M monthly default
 * - guest: Guest access, 0 tokens (cannot use API)
 *
 * TOKEN LIMIT SEMANTICS:
 * ----------------------
 * -  -1 = Unlimited (no restrictions)
 * -   0 = Restricted (cannot use API)
 * -  >0 = Specific limit (enforced)
 *
 * =============================================================================
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { database } = require('../services/database');

// Valid roles for the system
const VALID_ROLES = ['admin', 'user', 'guest'];

// Maximum token limit (100 million) - prevents unreasonable values
const MAX_TOKEN_LIMIT = 100000000;

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
    // Fetch all data in batch queries (3 queries total instead of 1 + 3N)
    const allUsers = database.users.listAll();
    const dailyUsageMap = database.usageLogs.getAllDailyUsage();
    const monthlyUsageMap = database.usageLogs.getAllMonthlyUsage();
    const projectCountMap = database.projects.getAllCounts();

    const defaultUsage = { input: 0, output: 0, total: 0 };

    const users = allUsers.map(user => {
      const daily = dailyUsageMap.get(user.id) || defaultUsage;
      const monthly = monthlyUsageMap.get(user.id) || defaultUsage;
      const projectCount = projectCountMap.get(user.id) || 0;

      // Calculate percentage: -1 = unlimited (null%), 0 = restricted (null%), >0 = actual percentage
      const dailyPercentage = user.daily_token_limit > 0
        ? Math.min(100, Math.round((daily.total / user.daily_token_limit) * 100))
        : null;
      const monthlyPercentage = user.monthly_token_limit > 0
        ? Math.min(100, Math.round((monthly.total / user.monthly_token_limit) * 100))
        : null;

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
          percentage: dailyPercentage,
          isUnlimited: user.daily_token_limit === -1,
          isRestricted: user.daily_token_limit === 0
        },
        monthly: {
          total: monthly.total,
          limit: user.monthly_token_limit,
          percentage: monthlyPercentage,
          isUnlimited: user.monthly_token_limit === -1,
          isRestricted: user.monthly_token_limit === 0
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
 * Admins cannot deactivate, change their own role, or set their own limits to 0 (restricted).
 *
 * Request body (all optional):
 *   {
 *     role?: 'admin' | 'user' | 'guest',
 *     isActive?: boolean,
 *     dailyTokenLimit?: number,   // -1 = unlimited, 0 = restricted, >0 = limit
 *     monthlyTokenLimit?: number  // -1 = unlimited, 0 = restricted, >0 = limit
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

    // Prevent admins from locking themselves out
    if (isSelf) {
      if (role !== undefined && role !== targetUser.role) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }
      if (isActive !== undefined && !isActive) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
      // Prevent setting own limits to 0 (restricted) - would lock out of API
      if (dailyTokenLimit !== undefined && parseInt(dailyTokenLimit, 10) === 0) {
        return res.status(400).json({ error: 'Cannot set your own daily limit to restricted (0)' });
      }
      if (monthlyTokenLimit !== undefined && parseInt(monthlyTokenLimit, 10) === 0) {
        return res.status(400).json({ error: 'Cannot set your own monthly limit to restricted (0)' });
      }
    }

    // Build update fields
    const fields = {};

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          error: `Role must be one of: ${VALID_ROLES.join(', ')}`
        });
      }
      fields.role = role;
    }

    if (isActive !== undefined) {
      fields.is_active = isActive ? 1 : 0;
    }

    // Token limit validation: -1 = unlimited, 0 = restricted, >0 = specific limit
    if (dailyTokenLimit !== undefined) {
      const limit = parseInt(dailyTokenLimit, 10);
      if (isNaN(limit) || limit < -1) {
        return res.status(400).json({
          error: 'Daily token limit must be -1 (unlimited), 0 (restricted), or a positive number'
        });
      }
      if (limit > MAX_TOKEN_LIMIT) {
        return res.status(400).json({
          error: `Daily token limit cannot exceed ${MAX_TOKEN_LIMIT.toLocaleString()}`
        });
      }
      fields.daily_token_limit = limit;
    }

    if (monthlyTokenLimit !== undefined) {
      const limit = parseInt(monthlyTokenLimit, 10);
      if (isNaN(limit) || limit < -1) {
        return res.status(400).json({
          error: 'Monthly token limit must be -1 (unlimited), 0 (restricted), or a positive number'
        });
      }
      if (limit > MAX_TOKEN_LIMIT) {
        return res.status(400).json({
          error: `Monthly token limit cannot exceed ${MAX_TOKEN_LIMIT.toLocaleString()}`
        });
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

    // Pre-fetch all users once and build a lookup map (2 queries instead of 1 + 2N)
    const allUsers = database.users.listAll();
    const userMap = new Map(allUsers.map(u => [u.id, u.username]));

    const codes = allCodes.map(code => ({
      id: code.id,
      code: code.code,
      isUsed: code.is_used === 1,
      createdBy: code.created_by ? userMap.get(code.created_by) || null : null,
      usedBy: code.used_by ? userMap.get(code.used_by) || null : null,
      createdAt: code.created_at,
      usedAt: code.used_at
    }));

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

/**
 * DELETE /api/admin/invite-codes/:id
 *
 * Delete an unused invite code.
 * Cannot delete codes that have already been used.
 *
 * Response: { success: true }
 */
router.delete('/api/admin/invite-codes/:id', requireAdmin, (req, res) => {
  try {
    const codeId = parseInt(req.params.id, 10);
    if (isNaN(codeId)) {
      return res.status(400).json({ error: 'Invalid invite code ID' });
    }

    const deleted = database.inviteCodes.deleteUnused(codeId);
    if (!deleted) {
      return res.status(404).json({ error: 'Invite code not found or already used' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete invite code error:', err.message);
    res.status(500).json({ error: 'Failed to delete invite code' });
  }
});

// =============================================================================
// ROLE DEFAULTS MANAGEMENT
// =============================================================================

/**
 * GET /api/admin/role-defaults
 *
 * List default token limits for all roles.
 * These defaults are applied when creating new users or can be used
 * as reference when changing a user's role.
 *
 * Response: { roleDefaults: [...] }
 */
router.get('/api/admin/role-defaults', requireAdmin, (req, res) => {
  try {
    const defaults = database.roleDefaults.listAll();

    const roleDefaults = defaults.map(rd => ({
      role: rd.role,
      dailyTokenLimit: rd.daily_token_limit,
      monthlyTokenLimit: rd.monthly_token_limit,
      color: rd.color,
      displayOrder: rd.display_order,
      updatedAt: rd.updated_at
    }));

    res.json({ roleDefaults });
  } catch (err) {
    console.error('Admin list role defaults error:', err.message);
    res.status(500).json({ error: 'Failed to load role defaults' });
  }
});

/**
 * PUT /api/admin/role-defaults/:role
 *
 * Update default token limits for a specific role.
 * These defaults are applied to new users with this role.
 *
 * Request body (all optional):
 *   {
 *     dailyTokenLimit?: number,   // -1 = unlimited, 0 = restricted, >0 = limit
 *     monthlyTokenLimit?: number  // -1 = unlimited, 0 = restricted, >0 = limit
 *   }
 *
 * Response: { roleDefault: {...} }
 */
router.put('/api/admin/role-defaults/:role', requireAdmin, (req, res) => {
  try {
    const { role } = req.params;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    const existing = database.roleDefaults.get(role);
    if (!existing) {
      return res.status(404).json({ error: 'Role defaults not found' });
    }

    const { dailyTokenLimit, monthlyTokenLimit } = req.body;
    const fields = {};

    // Token limit validation: -1 = unlimited, 0 = restricted, >0 = specific limit
    if (dailyTokenLimit !== undefined) {
      const limit = parseInt(dailyTokenLimit, 10);
      if (isNaN(limit) || limit < -1) {
        return res.status(400).json({
          error: 'Daily token limit must be -1 (unlimited), 0 (restricted), or a positive number'
        });
      }
      if (limit > MAX_TOKEN_LIMIT) {
        return res.status(400).json({
          error: `Daily token limit cannot exceed ${MAX_TOKEN_LIMIT.toLocaleString()}`
        });
      }
      fields.daily_token_limit = limit;
    }

    if (monthlyTokenLimit !== undefined) {
      const limit = parseInt(monthlyTokenLimit, 10);
      if (isNaN(limit) || limit < -1) {
        return res.status(400).json({
          error: 'Monthly token limit must be -1 (unlimited), 0 (restricted), or a positive number'
        });
      }
      if (limit > MAX_TOKEN_LIMIT) {
        return res.status(400).json({
          error: `Monthly token limit cannot exceed ${MAX_TOKEN_LIMIT.toLocaleString()}`
        });
      }
      fields.monthly_token_limit = limit;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = database.roleDefaults.update(role, fields);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update role defaults' });
    }

    res.json({
      roleDefault: {
        role: updated.role,
        dailyTokenLimit: updated.daily_token_limit,
        monthlyTokenLimit: updated.monthly_token_limit,
        color: updated.color,
        displayOrder: updated.display_order,
        updatedAt: updated.updated_at
      }
    });
  } catch (err) {
    console.error('Admin update role defaults error:', err.message);
    res.status(500).json({ error: 'Failed to update role defaults' });
  }
});

module.exports = router;
