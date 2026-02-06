/**
 * =============================================================================
 * MIGRATION 005: Role Defaults Table
 * =============================================================================
 *
 * Creates the role_defaults table to store configurable default token limits
 * for each role. Admins can modify these defaults in the admin dashboard.
 *
 * DEFAULT VALUES:
 * - Admin:      Unlimited (-1) daily/monthly
 * - Management: 500K daily, 10M monthly
 * - Editor:     500K daily, 10M monthly
 * - Viewer:     Restricted (0) daily/monthly
 *
 * The 'color' field stores the Tailwind color name for badge display.
 * The 'display_order' field controls the order in dropdowns and lists.
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
    -- ROLE DEFAULTS TABLE
    -- =========================================================================
    -- Stores configurable default token limits for each role.
    -- When a user's role changes, admins can optionally apply these defaults.
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS role_defaults (
      role                TEXT    PRIMARY KEY
                          CHECK(role IN ('admin', 'management', 'editor', 'viewer')),
      daily_token_limit   INTEGER NOT NULL,
      monthly_token_limit INTEGER NOT NULL,
      color               TEXT    NOT NULL,
      display_order       INTEGER NOT NULL,
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Insert default values for each role
    INSERT OR IGNORE INTO role_defaults (role, daily_token_limit, monthly_token_limit, color, display_order) VALUES
      ('admin',      -1,       -1,        'green',  1),
      ('management', 500000,   10000000,  'purple', 2),
      ('editor',     500000,   10000000,  'amber',  3),
      ('viewer',     0,        0,         'gray',   4);
  `);

  console.log('[Migration 005] Role defaults table created with initial values.');
}

module.exports = { up };
