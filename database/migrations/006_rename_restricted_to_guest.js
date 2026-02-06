/**
 * =============================================================================
 * MIGRATION 006: Rename 'restricted' role to 'guest'
 * =============================================================================
 *
 * Renames the 'restricted' role to 'guest' throughout the database.
 * The 'guest' role is more descriptive for users with restricted (0 token) access.
 *
 * CHANGES:
 * - Updates role CHECK constraint in users table: 'restricted' -> 'guest'
 * - Migrates all users with role='restricted' to role='guest'
 * - Updates role CHECK constraint in role_defaults table
 * - Updates role_defaults entry from 'restricted' to 'guest'
 *
 * NOTE: SQLite doesn't support ALTER TABLE for CHECK constraints, so we must
 * recreate the tables with the new constraint.
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
  // Count affected users
  const restrictedUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE role = 'restricted'
  `).get();

  if (restrictedUsers.count > 0) {
    console.log(`[Migration 006] Renaming ${restrictedUsers.count} user(s) from 'restricted' to 'guest' role`);
  }

  db.exec(`
    -- =========================================================================
    -- Step 1: Create new users table with 'guest' instead of 'restricted'
    -- =========================================================================
    CREATE TABLE users_new (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash   TEXT    NOT NULL,
      role            TEXT    NOT NULL DEFAULT 'editor'
                      CHECK(role IN ('admin', 'management', 'editor', 'guest')),
      is_active       INTEGER NOT NULL DEFAULT 1,
      daily_token_limit   INTEGER NOT NULL DEFAULT 500000,
      monthly_token_limit INTEGER NOT NULL DEFAULT 10000000,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      last_login_at   TEXT,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until    TEXT
    );

    -- =========================================================================
    -- Step 2: Copy data with role migration (restricted -> guest)
    -- =========================================================================
    INSERT INTO users_new (
      id, username, email, password_hash, role, is_active,
      daily_token_limit, monthly_token_limit,
      created_at, updated_at, last_login_at,
      failed_login_attempts, locked_until
    )
    SELECT
      id,
      username,
      email,
      password_hash,
      CASE WHEN role = 'restricted' THEN 'guest' ELSE role END,
      is_active,
      daily_token_limit,
      monthly_token_limit,
      created_at,
      updated_at,
      last_login_at,
      failed_login_attempts,
      locked_until
    FROM users;

    -- =========================================================================
    -- Step 3: Drop old table and rename new one
    -- =========================================================================
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;

    -- =========================================================================
    -- Step 4: Recreate indexes
    -- =========================================================================
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    -- =========================================================================
    -- Step 5: Create new role_defaults table with 'guest' instead of 'restricted'
    -- =========================================================================
    CREATE TABLE role_defaults_new (
      role                TEXT    PRIMARY KEY
                          CHECK(role IN ('admin', 'management', 'editor', 'guest')),
      daily_token_limit   INTEGER NOT NULL,
      monthly_token_limit INTEGER NOT NULL,
      color               TEXT    NOT NULL,
      display_order       INTEGER NOT NULL,
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- =========================================================================
    -- Step 6: Copy role_defaults data (restricted -> guest)
    -- =========================================================================
    INSERT INTO role_defaults_new (role, daily_token_limit, monthly_token_limit, color, display_order, updated_at)
    SELECT
      CASE WHEN role = 'restricted' THEN 'guest' ELSE role END,
      daily_token_limit,
      monthly_token_limit,
      color,
      display_order,
      updated_at
    FROM role_defaults;

    -- =========================================================================
    -- Step 7: Drop old table and rename new one
    -- =========================================================================
    DROP TABLE role_defaults;
    ALTER TABLE role_defaults_new RENAME TO role_defaults;
  `);

  // Log migration summary
  const roleCounts = db.prepare(`
    SELECT role, COUNT(*) as count FROM users GROUP BY role
  `).all();

  console.log('[Migration 006] Role rename complete (restricted -> guest):');
  roleCounts.forEach(({ role, count }) => {
    console.log(`  - ${role}: ${count} user(s)`);
  });
}

module.exports = { up };
