/**
 * Usage Routes — Token usage tracking and reporting.
 *
 * GET /api/usage         - Authenticated user's usage summary
 * GET /api/usage/history - Authenticated user's recent usage history
 * GET /api/admin/usage   - System-wide usage stats (admin only)
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { database } = require('../services/database');
const logger = require('../services/logger');

// --- User Endpoints ---

/** GET /api/usage — Get the authenticated user's daily/monthly usage summary. */
router.get('/api/usage', requireAuth, (req, res) => {
  try {
    const userId = req.user.userId;
    const user = database.users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const daily = database.usageLogs.getDailyUsage(userId);
    const monthly = database.usageLogs.getMonthlyUsage(userId);

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
    logger.error('Usage summary error', { error: err.message });
    res.status(500).json({ error: 'Failed to load usage data' });
  }
});

/**
 * GET /api/usage/history
 * Get authenticated user's recent API call history.
 * Query: ?limit=50 (default 50, max 200)
 */
router.get('/api/usage/history', requireAuth, (req, res) => {
  try {
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
    logger.error('Usage history error', { error: err.message });
    res.status(500).json({ error: 'Failed to load usage history' });
  }
});

// --- Admin Endpoint ---

/** GET /api/admin/usage — System-wide usage statistics (admin only). */
router.get('/api/admin/usage', requireAdmin, (req, res) => {
  try {
    const systemStats = database.usageLogs.getSystemStats();
    const allUsers = database.users.listAll();
    const dailyUsageMap = database.usageLogs.getAllDailyUsage();
    const monthlyUsageMap = database.usageLogs.getAllMonthlyUsage();

    const defaultUsage = { input: 0, output: 0, total: 0 };

    const userUsage = allUsers.map(user => {
      const daily = dailyUsageMap.get(user.id) || defaultUsage;
      const monthly = monthlyUsageMap.get(user.id) || defaultUsage;

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
    logger.error('Admin usage error', { error: err.message });
    res.status(500).json({ error: 'Failed to load usage statistics' });
  }
});

module.exports = router;
