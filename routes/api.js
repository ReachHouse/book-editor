/**
 * API Routes — Core editing endpoints.
 *
 * POST /api/edit-chunk          - Edit a text chunk via Claude
 * POST /api/generate-style-guide - Generate style guide for consistency
 * POST /api/generate-docx       - Create Word document with Track Changes
 */

'use strict';

const express = require('express');
const router = express.Router();
const { editChunk, generateStyleGuide, MODEL } = require('../services/anthropicService');
const { generateDocxBuffer } = require('../services/document');
const { requireAuth } = require('../middleware/auth');
const { database } = require('../services/database');
const config = require('../config/app');
const logger = require('../services/logger');

const MAX_TEXT_LENGTH = config.MAX_TEXT_LENGTH;

/**
 * Sanitize filename for Content-Disposition header.
 * Prevents HTTP Header Injection by removing control characters.
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return 'edited_document.docx';
  }
  return fileName
    .replace(/[\r\n\t\0]/g, '')
    .replace(/["']/g, '')
    .substring(0, 255);
}

/**
 * Validate that a value is a non-empty string within length limits.
 *
 * @param {*} value - Value to check
 * @param {string} fieldName - Name of field for error message
 * @param {number} maxLength - Maximum allowed length
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

// --- Usage limit helpers ---

/**
 * Check if a user has exceeded their daily or monthly token limits.
 * Limit values: -1 = unlimited, 0 = restricted, >0 = specific limit.
 */
function checkUsageLimits(userId) {
  const user = database.users.findById(userId);
  if (!user) return { allowed: false, reason: 'User not found' };

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

  return { allowed: true };
}

/** Log API usage to the database (non-critical — errors are swallowed). */
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
    logger.error('Usage logging error', { error: err.message });
  }
}

// --- Routes ---

/**
 * POST /api/edit-chunk
 * Edit a chunk of manuscript text using Claude.
 */
router.post('/api/edit-chunk', requireAuth, async (req, res) => {
  try {
    const { text, styleGuide, projectId, customStyleGuide } = req.body;
    const isFirst = req.body.isFirst === true;

    const textError = validateTextField(text, 'text');
    if (textError) {
      return res.status(400).json({ error: textError });
    }

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

    if (customStyleGuide !== undefined && customStyleGuide !== null) {
      if (typeof customStyleGuide !== 'string') {
        return res.status(400).json({ error: 'customStyleGuide must be a string' });
      }
      if (customStyleGuide.length > config.PROJECTS.MAX_CUSTOM_STYLE_GUIDE_LENGTH) {
        return res.status(400).json({ error: `customStyleGuide exceeds maximum size (${config.PROJECTS.MAX_CUSTOM_STYLE_GUIDE_LENGTH.toLocaleString()} chars)` });
      }
    }

    const limitCheck = checkUsageLimits(req.user.userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({ error: limitCheck.reason });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'Service temporarily unavailable'
      });
    }

    const result = await editChunk(text, styleGuide, isFirst, customStyleGuide);

    logUsage(req.user.userId, '/api/edit-chunk', result.usage, projectId);

    res.json({ editedText: result.text });

  } catch (error) {
    logger.error('Edit chunk error', { error: error.message });
    return res.status(500).json({ error: 'Failed to process text. Please try again.' });
  }
});

/**
 * POST /api/generate-style-guide
 * Generate a document-specific style guide from edited text.
 * Returns a default guide on error (non-critical endpoint).
 */
router.post('/api/generate-style-guide', requireAuth, async (req, res) => {
  try {
    const { text, projectId } = req.body;

    const textError = validateTextField(text, 'text');
    if (textError) {
      return res.status(400).json({ error: textError });
    }

    if (projectId !== undefined && projectId !== null) {
      if (typeof projectId !== 'string' || !projectId.trim()) {
        return res.status(400).json({ error: 'projectId must be a non-empty string' });
      }
    }

    const limitCheck = checkUsageLimits(req.user.userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({ error: limitCheck.reason });
    }

    const result = await generateStyleGuide(text);

    logUsage(req.user.userId, '/api/generate-style-guide', result.usage, projectId);

    res.json({ styleGuide: result.text });

  } catch (error) {
    logger.error('Style guide generation error', { error: error.message });
    return res.json({
      styleGuide: 'Professional, clear, and engaging style following Reach House standards.'
    });
  }
});

/**
 * POST /api/generate-docx
 * Generate a Word document with native Track Changes.
 */
router.post('/api/generate-docx', requireAuth, async (req, res) => {
  try {
    const { originalText, editedText, fileName } = req.body;

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

    const buffer = await generateDocxBuffer(originalText, editedText);
    const outputFileName = sanitizeFileName(fileName);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${outputFileName}"`
    );

    res.send(buffer);

    logger.debug('Document generated successfully', { fileName: outputFileName });

  } catch (error) {
    logger.error('Document generation error', { error: error.message });
    return res.status(500).json({ error: 'Failed to generate document. Please try again.' });
  }
});

module.exports = router;
