/**
 * =============================================================================
 * API ROUTES - Core Editing Endpoints
 * =============================================================================
 *
 * These routes handle the main editing functionality:
 * - Sending text chunks to Claude for editing
 * - Generating document-specific style guides
 * - Creating Word documents with Track Changes
 *
 * ENDPOINTS:
 * ----------
 * POST /api/edit-chunk         - Edit a text chunk using Claude AI
 * POST /api/generate-style-guide - Generate style guide for consistency
 * POST /api/generate-docx      - Create Word document with Track Changes
 *
 * WORKFLOW:
 * ---------
 * 1. Frontend splits document into ~2000 word chunks
 * 2. Each chunk sent to /api/edit-chunk
 * 3. After first chunk, /api/generate-style-guide creates consistency guide
 * 4. When complete, /api/generate-docx creates downloadable Word file
 *
 * ERROR HANDLING:
 * ---------------
 * - Input validation returns 400 for missing required fields
 * - API key issues return 500 with configuration error
 * - Service errors are caught and returned as 500 with message
 *
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { editChunk, generateStyleGuide, MODEL } = require('../services/anthropicService');
const { generateDocxBuffer } = require('../services/document');
const { requireAuth } = require('../middleware/auth');
const { database } = require('../services/database');
const config = require('../config/app');
const logger = require('../services/logger');

// =============================================================================
// INPUT VALIDATION HELPERS
// =============================================================================

const MAX_TEXT_LENGTH = config.MAX_TEXT_LENGTH;

/**
 * Sanitize filename for Content-Disposition header.
 * Prevents HTTP Header Injection attacks by removing control characters.
 *
 * @param {string} fileName - The filename to sanitize
 * @returns {string} Sanitized filename safe for HTTP headers
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return 'edited_document.docx';
  }
  // Remove newlines, carriage returns, and other control characters
  // Also remove quotes which could break the header format
  return fileName
    .replace(/[\r\n\t\0]/g, '')
    .replace(/["']/g, '')
    .substring(0, 255); // Limit length
}

/**
 * Validate that a value is a non-empty string within length limits.
 *
 * @param {*} value - Value to check
 * @param {string} fieldName - Name of field for error message
 * @param {number} maxLength - Maximum allowed length (default: MAX_TEXT_LENGTH)
 * @returns {string|null} Error message if invalid, null if valid
 */
function validateTextField(value, fieldName, maxLength = MAX_TEXT_LENGTH) {
  if (value === undefined || value === null) {
    return `${fieldName} is required`;
  }
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (!value.trim()) {
    return `${fieldName} cannot be empty`;
  }
  if (value.length > maxLength) {
    return `${fieldName} too long (max ${maxLength.toLocaleString()} characters)`;
  }
  return null;
}

// =============================================================================
// USAGE LIMIT HELPERS
// =============================================================================

/**
 * Check if a user has exceeded their daily or monthly token limits.
 *
 * Token limit semantics:
 *   -1 = Unlimited (no restrictions, skip check)
 *    0 = Restricted (cannot use API, always deny)
 *   >0 = Specific limit (check usage against limit)
 *
 * @param {number} userId - The user's ID
 * @returns {{ allowed: boolean, reason?: string }} Whether the request is allowed
 */
function checkUsageLimits(userId) {
  const user = database.users.findById(userId);
  if (!user) return { allowed: false, reason: 'User not found' };

  // Check daily limit: -1 = unlimited, 0 = restricted, >0 = check limit
  if (user.daily_token_limit === 0) {
    return {
      allowed: false,
      reason: 'Your account has restricted access. Contact an administrator to request editing permissions.'
    };
  }
  if (user.daily_token_limit > 0) {
    const daily = database.usageLogs.getDailyUsage(userId);
    if (daily.total >= user.daily_token_limit) {
      return {
        allowed: false,
        reason: `Daily token limit reached (${user.daily_token_limit.toLocaleString()} tokens). Resets at midnight UTC.`
      };
    }
  }
  // daily_token_limit === -1 means unlimited, skip check

  // Check monthly limit: -1 = unlimited, 0 = restricted, >0 = check limit
  if (user.monthly_token_limit === 0) {
    return {
      allowed: false,
      reason: 'Your account has restricted access. Contact an administrator to request editing permissions.'
    };
  }
  if (user.monthly_token_limit > 0) {
    const monthly = database.usageLogs.getMonthlyUsage(userId);
    if (monthly.total >= user.monthly_token_limit) {
      return {
        allowed: false,
        reason: `Monthly token limit reached (${user.monthly_token_limit.toLocaleString()} tokens). Resets on the 1st of next month.`
      };
    }
  }
  // monthly_token_limit === -1 means unlimited, skip check

  return { allowed: true };
}

/**
 * Log API usage to the database.
 *
 * @param {number} userId - The user's ID
 * @param {string} endpoint - The API endpoint name
 * @param {Object|null} usage - Token usage from Anthropic API response
 * @param {string} [projectId] - Optional project ID
 */
function logUsage(userId, endpoint, usage, projectId) {
  if (!usage) return;
  try {
    database.usageLogs.create({
      userId,
      endpoint,
      tokensInput: usage.input_tokens || 0,
      tokensOutput: usage.output_tokens || 0,
      model: MODEL,
      projectId: projectId || null
    });
  } catch (err) {
    // Usage logging is non-critical — don't fail the request
    logger.error('Usage logging error', { error: err.message });
  }
}

// =============================================================================
// EDITING ENDPOINT
// =============================================================================

/**
 * POST /api/edit-chunk
 *
 * Edit a chunk of manuscript text using Claude AI.
 *
 * This is the core editing endpoint called repeatedly by the frontend,
 * once for each ~2000 word chunk of the document.
 *
 * Request body:
 *   {
 *     text: string,           // Required: Text to edit
 *     styleGuide?: string,    // Optional: Style guide from previous chunks
 *     isFirst?: boolean       // Optional: True if first chunk (default false)
 *   }
 *
 * Response:
 *   { editedText: string }    // The edited text
 *
 * Errors:
 *   400 - No text provided
 *   500 - API key not configured or API error
 */
router.post('/api/edit-chunk', requireAuth, async (req, res) => {
  try {
    const { text, styleGuide, projectId, customStyleGuide } = req.body;
    const isFirst = req.body.isFirst === true; // Explicitly default to false

    // Validate required input with type checking
    const textError = validateTextField(text, 'text');
    if (textError) {
      return res.status(400).json({ error: textError });
    }

    // Validate optional fields
    if (styleGuide !== undefined && styleGuide !== null) {
      if (typeof styleGuide !== 'string') {
        return res.status(400).json({ error: 'styleGuide must be a string' });
      }
      if (styleGuide.length > config.PROJECTS.MAX_STYLE_GUIDE_LENGTH) {
        return res.status(400).json({ error: `styleGuide exceeds maximum size (${config.PROJECTS.MAX_STYLE_GUIDE_LENGTH.toLocaleString()} chars)` });
      }
    }

    if (projectId !== undefined && projectId !== null) {
      if (typeof projectId !== 'string' || !projectId.trim()) {
        return res.status(400).json({ error: 'projectId must be a non-empty string' });
      }
    }

    // Validate custom style guide (optional, max 50KB to allow detailed guides)
    if (customStyleGuide !== undefined && customStyleGuide !== null) {
      if (typeof customStyleGuide !== 'string') {
        return res.status(400).json({ error: 'customStyleGuide must be a string' });
      }
      if (customStyleGuide.length > config.PROJECTS.MAX_CUSTOM_STYLE_GUIDE_LENGTH) {
        return res.status(400).json({ error: `customStyleGuide exceeds maximum size (${config.PROJECTS.MAX_CUSTOM_STYLE_GUIDE_LENGTH.toLocaleString()} chars)` });
      }
    }

    // Enforce usage limits before making the API call
    const limitCheck = checkUsageLimits(req.user.userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({ error: limitCheck.reason });
    }

    // Check API key configuration
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'Service temporarily unavailable'
      });
    }

    // Send to Claude for editing (with optional custom style guide)
    const result = await editChunk(text, styleGuide, isFirst, customStyleGuide);

    // Log usage
    logUsage(req.user.userId, '/api/edit-chunk', result.usage, projectId);

    res.json({ editedText: result.text });

  } catch (error) {
    logger.error('Edit chunk error', { error: error.message });
    return res.status(500).json({ error: 'Failed to process text. Please try again.' });
  }
});

// =============================================================================
// STYLE GUIDE GENERATION ENDPOINT
// =============================================================================

/**
 * POST /api/generate-style-guide
 *
 * Generate a document-specific style guide from edited text.
 *
 * Called after the first chunk is edited. The resulting style guide
 * is included in subsequent chunk requests to maintain consistency.
 *
 * Request body:
 *   { text: string }          // Required: Edited text to analyze
 *
 * Response:
 *   { styleGuide: string }    // Brief style description
 *
 * Note: This endpoint returns a default guide on error rather than
 * failing, since style guide generation is not critical to editing.
 */
router.post('/api/generate-style-guide', requireAuth, async (req, res) => {
  try {
    const { text, projectId } = req.body;

    // Validate required input with type checking
    const textError = validateTextField(text, 'text');
    if (textError) {
      return res.status(400).json({ error: textError });
    }

    // Validate optional projectId
    if (projectId !== undefined && projectId !== null) {
      if (typeof projectId !== 'string' || !projectId.trim()) {
        return res.status(400).json({ error: 'projectId must be a non-empty string' });
      }
    }

    // Enforce usage limits before making the API call
    const limitCheck = checkUsageLimits(req.user.userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({ error: limitCheck.reason });
    }

    // Generate style guide from edited text
    const result = await generateStyleGuide(text);

    // Log usage
    logUsage(req.user.userId, '/api/generate-style-guide', result.usage, projectId);

    res.json({ styleGuide: result.text });

  } catch (error) {
    logger.error('Style guide generation error', { error: error.message });
    return res.json({
      styleGuide: 'Professional, clear, and engaging style following Reach House standards.'
    });
  }
});

// =============================================================================
// DOCUMENT GENERATION ENDPOINT
// =============================================================================

/**
 * POST /api/generate-docx
 *
 * Generate a Word document with native Track Changes.
 *
 * This is the final step in the editing workflow. It takes the original
 * and edited text, computes the diff, and creates a .docx file with
 * proper Track Changes markup.
 *
 * Request body:
 *   {
 *     originalText: string,   // Required: Original manuscript text
 *     editedText: string,     // Required: AI-edited text
 *     fileName?: string       // Optional: Output filename
 *   }
 *
 * Response:
 *   Binary .docx file with Content-Disposition header for download
 *
 * Track Changes format in the output:
 *   - Deletions: Red strikethrough
 *   - Insertions: Blue underline
 *   - Author: "AI Editor"
 */
router.post('/api/generate-docx', requireAuth, async (req, res) => {
  try {
    const { originalText, editedText, fileName } = req.body;

    // Validate required inputs with type checking
    const originalError = validateTextField(originalText, 'originalText');
    if (originalError) {
      return res.status(400).json({ error: originalError });
    }

    const editedError = validateTextField(editedText, 'editedText');
    if (editedError) {
      return res.status(400).json({ error: editedError });
    }

    logger.debug('Generating document with Track Changes', {
      originalLength: originalText.length,
      editedLength: editedText.length
    });

    // Generate the .docx buffer
    const buffer = await generateDocxBuffer(originalText, editedText);

    // Sanitize filename to prevent HTTP Header Injection
    const outputFileName = sanitizeFileName(fileName);

    // Set headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${outputFileName}"`
    );

    // Send the binary buffer
    res.send(buffer);

    logger.debug('Document generated successfully', { fileName: outputFileName });

  } catch (error) {
    logger.error('Document generation error', { error: error.message });
    return res.status(500).json({ error: 'Failed to generate document. Please try again.' });
  }
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = router;
