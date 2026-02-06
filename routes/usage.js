/**
 * =============================================================================
 * USAGE ROUTES - Token Usage Tracking & Reporting
 * =============================================================================
 *
 * Endpoints for users to view their own token usage and for admins to view
 * system-wide usage statistics.
 *
 * All endpoints require authentication (requireAuth middleware).
 * Admin endpoints additionally require admin role (requireAdmin middleware).
 *
 * ENDPOINTS:
 * ----------
 * GET /api/usage          - Get authenticated user's usage summary
 * GET /api/usage/history  - Get authenticated user's recent usage history
 * GET /api/admin/usage    - Get system-wide usage stats (admin only)
 *
 * =============================================================================
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { database } = require('../services/database');

// =============================================================================
// USER USAGE ENDPOINTS
// =============================================================================

/**
 * GET /api/usage
 *
 * Get the authenticated user's usage summary including:
 * - Daily token usage and limit
 * - Monthly token usage and limit
 * - Percentage of limits used
 *
 * Response: { daily: {...}, monthly: {...}, limits: {...} }
 */
router.get('/api/usage', requireAuth, (req, res) => {
  try {
    const userId = req.user.userId;
    const user = database.users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const daily = database.usageLogs.getDailyUsage(userId);
    const monthly = database.usageLogs.getMonthlyUsage(userId);

    // Calculate percentage: -1 = unlimited, 0 = restricted, >0 = actual percentage
    const dailyPercentage = user.daily_token_limit > 0
      ? Math.min(100, Math.round((daily.total / user.daily_token_limit) * 100))
      : null;
    const monthlyPercentage = user.monthly_token_limit > 0
      ? Math.min(100, Math.round((monthly.total / user.monthly_token_limit) * 100))
      : null;

    res.json({
      daily: {
        input: daily.input,
        output: daily.output,
        total: daily.total,
        limit: user.daily_token_limit,
        percentage: dailyPercentage,
        isUnlimited: user.daily_token_limit === -1,
        isRestricted: user.daily_token_limit === 0
      },
      monthly: {
        input: monthly.input,
        output: monthly.output,
        total: monthly.total,
        limit: user.monthly_token_limit,
        percentage: monthlyPercentage,
        isUnlimited: user.monthly_token_limit === -1,
        isRestricted: user.monthly_token_limit === 0
      }
    });
  } catch (err) {
    console.error('Usage summary error:', err.message);
    res.status(500).json({ error: 'Failed to load usage data' });
  }
});

/**
 * GET /api/usage/history
 *
 * Get the authenticated user's recent API call history.
 *
 * Query params:
 *   limit (optional, default 50, max 200)
 *
 * Response: { history: [...] }
 */
router.get('/api/usage/history', requireAuth, (req, res) => {
  try {
    // Clamp limit to 1-200 range, defaulting to 50
    const parsed = parseInt(req.query.limit, 10);
    const limit = Math.max(1, Math.min(isNaN(parsed) ? 50 : parsed, 200));
    const history = database.usageLogs.getHistory(req.user.userId, limit);

    res.json({
      history: history.map(row => ({
        id: row.id,
        endpoint: row.endpoint,
        tokensInput: row.tokens_input,
        tokensOutput: row.tokens_output,
        tokensTotal: row.tokens_input + row.tokens_output,
        model: row.model,
        projectId: row.project_id,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    console.error('Usage history error:', err.message);
    res.status(500).json({ error: 'Failed to load usage history' });
  }
});

// =============================================================================
// ADMIN USAGE ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/usage
 *
 * Get system-wide usage statistics (admin only).
 *
 * Response: { system: {...}, users: [...] }
 */
router.get('/api/admin/usage', requireAdmin, (req, res) => {
  try {
    // Fetch all data in batch queries (4 queries total instead of 1 + 2N)
    const systemStats = database.usageLogs.getSystemStats();
    const allUsers = database.users.listAll();
    const dailyUsageMap = database.usageLogs.getAllDailyUsage();
    const monthlyUsageMap = database.usageLogs.getAllMonthlyUsage();

    const defaultUsage = { input: 0, output: 0, total: 0 };

    const userUsage = allUsers.map(user => {
      const daily = dailyUsageMap.get(user.id) || defaultUsage;
      const monthly = monthlyUsageMap.get(user.id) || defaultUsage;

      // Calculate percentage: -1 = unlimited, 0 = restricted, >0 = actual percentage
      const dailyPercentage = user.daily_token_limit > 0
        ? Math.min(100, Math.round((daily.total / user.daily_token_limit) * 100))
        : null;
      const monthlyPercentage = user.monthly_token_limit > 0
        ? Math.min(100, Math.round((monthly.total / user.monthly_token_limit) * 100))
        : null;

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.is_active === 1,
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

    res.json({
      system: {
        totalCalls: systemStats.totalCalls,
        totalTokens: systemStats.totalTokens,
        uniqueUsers: systemStats.uniqueUsers
      },
      users: userUsage
    });
  } catch (err) {
    console.error('Admin usage error:', err.message);
    res.status(500).json({ error: 'Failed to load usage statistics' });
  }
});

module.exports = router;
