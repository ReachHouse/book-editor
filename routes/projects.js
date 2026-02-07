/**
 * Project Routes — Server-side project storage (CRUD).
 * All endpoints require authentication; users can only access their own projects.
 *
 * GET    /api/projects     - List user's projects (metadata only)
 * GET    /api/projects/:id - Get full project data
 * PUT    /api/projects/:id - Save/update a project (upsert)
 * DELETE /api/projects/:id - Delete a project
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

// --- Helpers ---

/** Format a database row into project metadata for list responses. */
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

/** Safely parse JSON with fallback for corrupted data. */
function safeJsonParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (err) {
    logger.error('JSON parse error in project data', { error: err.message });
    return fallback;
  }
}

/** Format a database row into a full project object (including text content). */
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

// --- Routes ---

/**
 * GET /api/projects
 * List projects with pagination. Returns metadata only (no large text fields).
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

/** GET /api/projects/:id — Get a single project with full data. */
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

/**
 * PUT /api/projects/:id
 * Save or update a project (upsert). Creates if new, updates if existing.
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

    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return res.status(400).json({ error: 'fileName is required and cannot be empty' });
    }

    if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

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

    // Atomic check-and-save to prevent concurrent requests bypassing the limit
    const saved = database.transaction(() => {
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
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    logger.error('Save project error', { error: err.message });
    res.status(500).json({ error: 'Failed to save project' });
  }
});

/** DELETE /api/projects/:id — Delete a project owned by the authenticated user. */
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
