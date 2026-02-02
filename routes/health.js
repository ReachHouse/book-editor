/**
 * Health Check Routes
 * Provides endpoints for monitoring application status
 */

const express = require('express');
const router = express.Router();

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Validate required environment variables
 * @returns {string[]} Array of issue descriptions
 */
function validateEnvironment() {
  const issues = [];

  if (!process.env.ANTHROPIC_API_KEY) {
    issues.push('ANTHROPIC_API_KEY is not set');
  } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    issues.push('ANTHROPIC_API_KEY appears to be invalid (should start with sk-ant-)');
  }

  return issues;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/health', (req, res) => {
  const envIssues = validateEnvironment();

  res.json({
    status: envIssues.length === 0 ? 'ok' : 'warning',
    message: 'Book Editor Backend is running',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    issues: envIssues.length > 0 ? envIssues : undefined
  });
});

/**
 * GET /api/status
 * Configuration status check
 */
router.get('/api/status', (req, res) => {
  const envIssues = validateEnvironment();

  res.json({
    status: envIssues.length === 0 ? 'ready' : 'configuration_needed',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
  });
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
module.exports.validateEnvironment = validateEnvironment;
