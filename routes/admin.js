/**
 * Admin Routes — User, role & invite code management.
 * All endpoints require admin role.
 *
 * GET    /api/admin/users               - List all users with usage
 * PUT    /api/admin/users/:id           - Update user (role, limits, active)
 * DELETE /api/admin/users/:id           - Delete a user
 * GET    /api/admin/invite-codes        - List all invite codes
 * POST   /api/admin/invite-codes        - Generate a new invite code
 * DELETE /api/admin/invite-codes/:id    - Delete an unused invite code
 * GET    /api/admin/role-defaults       - List default limits for all roles
 * PUT    /api/admin/role-defaults/:role - Update default limits for a role
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { database } = require('../services/database');
const config = require('../config/app');
const logger = require('../services/logger');

const VALID_ROLES = config.VALID_ROLES;
const MAX_TOKEN_LIMIT = config.TOKEN_LIMITS.MAX;

// --- User Management ---

/**
 * GET /api/admin/users
 * List all users with current usage data. No password hashes returned.
 */
router.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const allUsers = database.users.listAll();
    const dailyUsageMap = database.usageLogs.getAllDailyUsage();
    const monthlyUsageMap = database.usageLogs.getAllMonthlyUsage();
    const projectCountMap = database.projects.getAllCounts();

    const defaultUsage = { input: 0, output: 0, total: 0 };

    const users = allUsers.map(user => {
      const daily = dailyUsageMap.get(user.id) || defaultUsage;
      const monthly = monthlyUsageMap.get(user.id) || defaultUsage;
      const projectCount = projectCountMap.get(user.id) || 0;

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
    logger.error('Admin list users error', { error: err.message });
    res.status(500).json({ error: 'Failed to load users' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update a user's role, active status, or token limits.
 * Admins cannot change their own role or restrict themselves.
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
      if (dailyTokenLimit !== undefined && parseInt(dailyTokenLimit, 10) === 0) {
        return res.status(400).json({ error: 'Cannot set your own daily limit to restricted (0)' });
      }
      if (monthlyTokenLimit !== undefined && parseInt(monthlyTokenLimit, 10) === 0) {
        return res.status(400).json({ error: 'Cannot set your own monthly limit to restricted (0)' });
      }
    }

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
    logger.error('Admin update user error', { error: err.message });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and all their data. Admins cannot delete themselves.
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

    database.sessions.deleteAllForUser(targetId);
    database.users.delete(targetId);
    res.json({ success: true });
  } catch (err) {
    logger.error('Admin delete user error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Invite Code Management ---

/**
 * GET /api/admin/invite-codes
 * List all invite codes with usage info.
 */
router.get('/api/admin/invite-codes', requireAdmin, (req, res) => {
  try {
    const allCodes = database.inviteCodes.listAll();

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
    logger.error('Admin list invite codes error', { error: err.message });
    res.status(500).json({ error: 'Failed to load invite codes' });
  }
});

/** POST /api/admin/invite-codes — Generate a new invite code. */
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
    logger.error('Admin create invite code error', { error: err.message });
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

/** DELETE /api/admin/invite-codes/:id — Delete an unused invite code. */
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
    logger.error('Admin delete invite code error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete invite code' });
  }
});

// --- Role Defaults ---

/**
 * GET /api/admin/role-defaults
 * List default token limits for all roles.
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
    logger.error('Admin list role defaults error', { error: err.message });
    res.status(500).json({ error: 'Failed to load role defaults' });
  }
});

/**
 * PUT /api/admin/role-defaults/:role
 * Update default token limits for a specific role.
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
    logger.error('Admin update role defaults error', { error: err.message });
    res.status(500).json({ error: 'Failed to update role defaults' });
  }
});

module.exports = router;
