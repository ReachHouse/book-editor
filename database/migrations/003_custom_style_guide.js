/**
 * =============================================================================
 * MIGRATION 003: Custom Style Guide
 * =============================================================================
 *
 * Adds a custom_style_guide column to the projects table.
 * This allows users to customize the style guide used by the AI when editing
 * their documents. If null/empty, the default style guide is used.
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
    -- ADD CUSTOM STYLE GUIDE COLUMN
    -- =========================================================================
    -- Stores user-customized style guide content per project.
    -- NULL means use the default Reach Publishers style guide.
    -- Max recommended size: 50KB (about 10,000 words)
    -- =========================================================================
    ALTER TABLE projects ADD COLUMN custom_style_guide TEXT;
  `);
}

module.exports = { up };
