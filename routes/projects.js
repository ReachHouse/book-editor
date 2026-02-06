/**
 * =============================================================================
 * PROJECT ROUTES - Server-Side Project Storage
 * =============================================================================
 *
 * CRUD endpoints for managing editing projects. Replaces client-side
 * IndexedDB/localStorage with persistent server-backed storage.
 *
 * All endpoints require authentication (requireAuth middleware).
 * Users can only access their own projects (enforced by user_id checks).
 *
 * ENDPOINTS:
 * ----------
 * GET    /api/projects      - List user's projects (metadata only)
 * GET    /api/projects/:id  - Get full project data (includes text content)
 * PUT    /api/projects/:id  - Save/update a project (upsert)
 * DELETE /api/projects/:id  - Delete a project
 *
 * =============================================================================
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { database } = require('../services/database');
const config = require('../config/app');
const logger = require('../services/logger');

const MAX_PROJECT_TEXT_LENGTH = config.PROJECTS.MAX_TEXT_LENGTH;
const MAX_PROJECTS_PER_USER = config.PROJECTS.MAX_PER_USER;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format a database row into a project metadata object for list responses.
 *
 * @param {Object} row - Database row
 * @returns {Object} Formatted project metadata
 */
function formatProjectMeta(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    isComplete: row.is_complete === 1,
    chunksCompleted: row.chunks_completed,
    totalChunks: row.total_chunks,
    chunkSize: row.chunk_size,
    timestamp: new Date(row.updated_at + 'Z').getTime(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Safely parse JSON with fallback for corrupted data.
 *
 * @param {string|null} json - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed value or fallback
 */
function safeJsonParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (err) {
    logger.error('JSON parse error in project data', { error: err.message });
    return fallback;
  }
}

/**
 * Format a database row into a full project object (including text content).
 *
 * @param {Object} row - Database row with all columns
 * @returns {Object} Full project data
 */
function formatProjectFull(row) {
  const meta = formatProjectMeta(row);
  return {
    ...meta,
    originalText: row.original_text,
    editedChunks: safeJsonParse(row.edited_chunks, []),
    fullEditedText: row.full_edited_text,
    styleGuide: row.style_guide,
    customStyleGuide: row.custom_style_guide,
    docContent: safeJsonParse(row.doc_content, null)
  };
}

// =============================================================================
// LIST PROJECTS
// =============================================================================

/**
 * GET /api/projects
 *
 * List projects for the authenticated user with pagination.
 * Returns metadata only (no large text fields) for efficient listing.
 *
 * Query params:
 *   limit  (optional, default 20, max 50)
 *   offset (optional, default 0)
 *
 * Response: { projects: [...], total: number, limit: number, offset: number }
 */
router.get('/api/projects', requireAuth, (req, res) => {
  try {
    const parsedLimit = parseInt(req.query.limit, 10);
    const parsedOffset = parseInt(req.query.offset, 10);
    const limit = Math.max(1, Math.min(isNaN(parsedLimit) ? 20 : parsedLimit, MAX_PROJECTS_PER_USER));
    const offset = Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset);

    const total = database.projects.count(req.user.userId);
    const rows = database.projects.listByUser(req.user.userId, limit, offset);
    const projects = rows.map(formatProjectMeta);

    // ETag based on latest updated_at for cache validation
    if (rows.length > 0) {
      const latestUpdate = rows[0].updated_at;
      const etag = `"projects-${req.user.userId}-${latestUpdate}"`;
      res.setHeader('ETag', etag);

      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
    }

    res.json({ projects, total, limit, offset });
  } catch (err) {
    logger.error('List projects error', { error: err.message });
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// =============================================================================
// GET SINGLE PROJECT
// =============================================================================

/**
 * GET /api/projects/:id
 *
 * Get a single project with full data (including text content).
 * Used when resuming editing or downloading a completed project.
 *
 * Response: Full project object
 */
router.get('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const row = database.projects.findById(req.params.id, req.user.userId);
    if (!row) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(formatProjectFull(row));
  } catch (err) {
    logger.error('Get project error', { error: err.message });
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// =============================================================================
// SAVE/UPDATE PROJECT
// =============================================================================

/**
 * PUT /api/projects/:id
 *
 * Save or update a project (upsert). Creates if new, updates if existing.
 * Called after each chunk is edited and on completion.
 *
 * Request body: Project data (fileName, originalText, editedChunks, etc.)
 * Response: { project: metadata }
 */
router.put('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;
    const {
      fileName, isComplete, chunksCompleted, totalChunks, chunkSize,
      originalText, editedChunks, fullEditedText, styleGuide, docContent,
      customStyleGuide
    } = req.body;

    // Validate required fields
    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return res.status(400).json({ error: 'fileName is required and cannot be empty' });
    }

    if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Validate text sizes (both original and edited must be within limits)
    if (originalText && originalText.length > MAX_PROJECT_TEXT_LENGTH) {
      return res.status(400).json({ error: 'Original text exceeds maximum size' });
    }
    if (fullEditedText && fullEditedText.length > MAX_PROJECT_TEXT_LENGTH) {
      return res.status(400).json({ error: 'Edited text exceeds maximum size' });
    }
    if (styleGuide && styleGuide.length > config.PROJECTS.MAX_STYLE_GUIDE_LENGTH) {
      return res.status(400).json({ error: `Style guide exceeds maximum size (${config.PROJECTS.MAX_STYLE_GUIDE_LENGTH.toLocaleString()} chars)` });
    }
    if (customStyleGuide && customStyleGuide.length > config.PROJECTS.MAX_CUSTOM_STYLE_GUIDE_LENGTH) {
      return res.status(400).json({ error: `Custom style guide exceeds maximum size (${config.PROJECTS.MAX_CUSTOM_STYLE_GUIDE_LENGTH.toLocaleString()} chars)` });
    }
    if (fileName.length > config.PROJECTS.MAX_FILE_NAME_LENGTH) {
      return res.status(400).json({ error: `File name exceeds maximum length (${config.PROJECTS.MAX_FILE_NAME_LENGTH} chars)` });
    }

    // Use transaction for atomic check-and-save to prevent race conditions
    // where two concurrent requests could both pass the limit check
    const saved = database.transaction(() => {
      // Check project limit (only for new projects)
      const existing = database.projects.findById(projectId, userId);
      if (!existing) {
        const count = database.projects.count(userId);
        if (count >= MAX_PROJECTS_PER_USER) {
          const error = new Error(`Maximum ${MAX_PROJECTS_PER_USER} projects allowed. Delete old projects to make room.`);
          error.status = 400;
          throw error;
        }
      }

      return database.projects.save(userId, {
        id: projectId,
        fileName,
        isComplete: !!isComplete,
        chunksCompleted: chunksCompleted || 0,
        totalChunks: totalChunks || 0,
        chunkSize: chunkSize || 2000,
        originalText: originalText || null,
        editedChunks: editedChunks || null,
        fullEditedText: fullEditedText || null,
        styleGuide: styleGuide || null,
        docContent: docContent || null,
        customStyleGuide: customStyleGuide || null
      });
    });

    res.json({ project: formatProjectMeta(saved) });
  } catch (err) {
    // Handle known errors with custom status codes
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    logger.error('Save project error', { error: err.message });
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// =============================================================================
// DELETE PROJECT
// =============================================================================

/**
 * DELETE /api/projects/:id
 *
 * Delete a project owned by the authenticated user.
 *
 * Response: { success: true }
 */
router.delete('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const deleted = database.projects.delete(req.params.id, req.user.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete project error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
