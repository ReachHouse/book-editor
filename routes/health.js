/**
 * Health Check Routes — Monitoring and configuration status.
 *
 * GET /health     - Health check with warnings (deployment verification)
 * GET /api/status - API readiness check for frontend
 */

'use strict';

const express = require('express');
const router = express.Router();
const { database } = require('../services/database');

/**
 * Validate required environment variables.
 * @returns {string[]} Array of issue descriptions (empty if all valid)
 */
function validateEnvironment() {
  const issues = [];

  if (!process.env.ANTHROPIC_API_KEY) {
    issues.push('ANTHROPIC_API_KEY is not set');
  } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    issues.push('ANTHROPIC_API_KEY appears to be invalid (should start with sk-ant-)');
  }

  if (!process.env.JWT_SECRET) {
    issues.push('JWT_SECRET is not set (tokens will not persist across restarts)');
  } else if (process.env.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET is too short (should be at least 32 characters)');
  }

  if (!process.env.SETUP_SECRET) {
    issues.push('SETUP_SECRET is not set (first-time setup wizard will be disabled)');
  }

  if (process.env.NODE_ENV !== 'production') {
    issues.push(`NODE_ENV is "${process.env.NODE_ENV || 'undefined'}" (should be "production" for deployment)`);
  }

  return issues;
}

/** GET /health — Basic health check for monitoring and deployment verification. */
router.get('/health', (req, res) => {
  const envIssues = validateEnvironment();

  let dbHealthy = false;
  try {
    if (database.initialized && database.db) {
      database.db.prepare('SELECT 1').get();
      dbHealthy = true;
    }
  } catch (err) {
    envIssues.push(`Database error: ${err.message}`);
  }

  if (!dbHealthy && !envIssues.some(i => i.includes('Database'))) {
    envIssues.push('Database not initialized');
  }

  const statusCode = dbHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: !dbHealthy ? 'unhealthy' : (envIssues.length === 0 ? 'ok' : 'warning'),
    message: 'Book Editor Backend is running',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    databaseHealthy: dbHealthy,
    issues: envIssues.length > 0 ? envIssues : undefined
  });
});

/** GET /api/status — Configuration status for the frontend. */
router.get('/api/status', (req, res) => {
  const envIssues = validateEnvironment();

  res.json({
    status: envIssues.length === 0 ? 'ready' : 'configuration_needed',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
  });
});

module.exports = router;
module.exports.validateEnvironment = validateEnvironment;
