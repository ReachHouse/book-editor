/**
 * =============================================================================
 * HEALTH CHECK ROUTES
 * =============================================================================
 *
 * Provides endpoints for monitoring application status and configuration.
 * Used for:
 * - Deployment verification (check if app is running)
 * - Configuration validation (check if API key is set)
 * - Debugging (identify configuration issues)
 *
 * ENDPOINTS:
 * ----------
 * GET /health      - Basic health check, returns status and warnings
 * GET /api/status  - API configuration status for frontend
 *
 * USAGE:
 * ------
 * After deployment, verify with:
 *   curl https://your-domain:3002/health
 *
 * Response when healthy:
 *   { "status": "ok", "message": "...", "apiKeyConfigured": true }
 *
 * Response with issues:
 *   { "status": "warning", "issues": ["ANTHROPIC_API_KEY is not set"] }
 *
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

/**
 * Validate required environment variables.
 *
 * Checks for:
 * - ANTHROPIC_API_KEY existence
 * - ANTHROPIC_API_KEY format (should start with sk-ant-)
 *
 * Called at server startup and on health check requests.
 *
 * @returns {string[]} Array of issue descriptions (empty if all valid)
 */
function validateEnvironment() {
  const issues = [];

  // Check API key exists
  if (!process.env.ANTHROPIC_API_KEY) {
    issues.push('ANTHROPIC_API_KEY is not set');
  } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    // Check API key format (Anthropic keys start with sk-ant-)
    issues.push('ANTHROPIC_API_KEY appears to be invalid (should start with sk-ant-)');
  }

  return issues;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /health
 *
 * Basic health check endpoint for monitoring and deployment verification.
 * Returns current status, API key configuration, and any warnings.
 *
 * Use this endpoint to:
 * - Verify the server is running after deployment
 * - Check for configuration issues
 * - Monitor uptime with external tools
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
 *
 * Configuration status check for the frontend.
 * Returns whether the API is ready to process requests.
 *
 * The frontend calls this to determine if it can proceed with editing.
 */
router.get('/api/status', (req, res) => {
  const envIssues = validateEnvironment();

  res.json({
    status: envIssues.length === 0 ? 'ready' : 'configuration_needed',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY
  });
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = router;

// Also export validateEnvironment for use in server.js startup
module.exports.validateEnvironment = validateEnvironment;
