/**
 * =============================================================================
 * MIGRATION 002: Projects Table
 * =============================================================================
 *
 * Creates the projects table for server-side storage of editing projects.
 * Replaces client-side IndexedDB/localStorage storage with persistent
 * server-backed storage tied to user accounts.
 *
 * Columns:
 * - id, user_id: composite key (id is client-generated timestamp string)
 * - file_name, is_complete, chunks_completed, total_chunks, chunk_size: metadata
 * - original_text, edited_chunks, full_edited_text, style_guide, doc_content: content
 * - created_at, updated_at: timestamps
 *
 * Content columns store the large text fields. The metadata columns allow
 * efficient listing without loading the full text content.
 *
 * =============================================================================
 */

'use strict';

/**
 * Run the migration.
 *
 * @param {import('better-sqlite3').Database} db
 */
function up(db) {
  db.exec(`
    -- =========================================================================
    -- PROJECTS TABLE
    -- =========================================================================
    -- Stores editing projects per user. Each project represents a manuscript
    -- being edited (or already completed).
    --
    -- The id is a client-generated timestamp string (Date.now().toString()).
    -- Combined with user_id as a composite primary key to prevent collisions.
    --
    -- Large text fields (original_text, edited_chunks, etc.) are stored
    -- separately from metadata to allow lightweight listing queries.
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS projects (
      id                TEXT    NOT NULL,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name         TEXT    NOT NULL,
      is_complete       INTEGER NOT NULL DEFAULT 0,
      chunks_completed  INTEGER NOT NULL DEFAULT 0,
      total_chunks      INTEGER NOT NULL DEFAULT 0,
      chunk_size        INTEGER NOT NULL DEFAULT 2000,
      original_text     TEXT,
      edited_chunks     TEXT,
      full_edited_text  TEXT,
      style_guide       TEXT,
      doc_content       TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, user_id)
    );

    -- Index for listing a user's projects sorted by update time
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id, updated_at DESC);
  `);
}

module.exports = { up };
