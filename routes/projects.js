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

/**
 * Maximum project data size (10MB of text content).
 * Manuscripts typically range from 50KB to 1MB.
 */
const MAX_PROJECT_TEXT_LENGTH = 10 * 1024 * 1024;

/**
 * Maximum projects per user to prevent abuse.
 */
const MAX_PROJECTS_PER_USER = 50;

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
    editedChunks: row.edited_chunks ? JSON.parse(row.edited_chunks) : [],
    fullEditedText: row.full_edited_text,
    styleGuide: row.style_guide,
    docContent: row.doc_content ? JSON.parse(row.doc_content) : null
  };
}

// =============================================================================
// LIST PROJECTS
// =============================================================================

/**
 * GET /api/projects
 *
 * List all projects for the authenticated user.
 * Returns metadata only (no large text fields) for efficient listing.
 *
 * Response: { projects: [...] }
 */
router.get('/api/projects', requireAuth, (req, res) => {
  try {
    const rows = database.projects.listByUser(req.user.userId);
    const projects = rows.map(formatProjectMeta);
    res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err.message);
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
    console.error('Get project error:', err.message);
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
      originalText, editedChunks, fullEditedText, styleGuide, docContent
    } = req.body;

    // Validate required fields
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'fileName is required' });
    }

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Validate text size
    if (originalText && originalText.length > MAX_PROJECT_TEXT_LENGTH) {
      return res.status(400).json({ error: 'Project text exceeds maximum size' });
    }

    // Check project limit (only for new projects)
    const existing = database.projects.findById(projectId, userId);
    if (!existing) {
      const count = database.projects.count(userId);
      if (count >= MAX_PROJECTS_PER_USER) {
        return res.status(400).json({
          error: `Maximum ${MAX_PROJECTS_PER_USER} projects allowed. Delete old projects to make room.`
        });
      }
    }

    const saved = database.projects.save(userId, {
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
      docContent: docContent || null
    });

    res.json({ project: formatProjectMeta(saved) });
  } catch (err) {
    console.error('Save project error:', err.message);
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
    console.error('Delete project error:', err.message);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
