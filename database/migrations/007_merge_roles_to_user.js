/**
 * =============================================================================
 * MIGRATION 007: Merge 'management' and 'editor' roles into 'user'
 * =============================================================================
 *
 * Simplifies the role system from 4 roles to 3 roles:
 * - admin: Full access, unlimited tokens
 * - user: Standard access (replaces management and editor)
 * - guest: Restricted access, 0 tokens
 *
 * CHANGES:
 * - Updates role CHECK constraint in users table: ('admin', 'user', 'guest')
 * - Migrates all users with role='management' or role='editor' to role='user'
 * - Updates role CHECK constraint in role_defaults table
 * - Removes 'management' and 'editor' rows from role_defaults
 * - Keeps 'user' role defaults (500K daily, 10M monthly)
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
  const managementUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE role = 'management'
  `).get();
  const editorUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE role = 'editor'
  `).get();

  console.log(`[Migration 007] Merging roles into 'user':`);
  console.log(`  - ${managementUsers.count} user(s) with 'management' role`);
  console.log(`  - ${editorUsers.count} user(s) with 'editor' role`);

  db.exec(`
    -- =========================================================================
    -- Step 1: Create new users table with simplified role constraint
    -- =========================================================================
    CREATE TABLE users_new (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash   TEXT    NOT NULL,
      role            TEXT    NOT NULL DEFAULT 'user'
                      CHECK(role IN ('admin', 'user', 'guest')),
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
    -- Step 2: Copy data with role migration (management/editor -> user)
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
      CASE
        WHEN role = 'management' THEN 'user'
        WHEN role = 'editor' THEN 'user'
        ELSE role
      END,
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
    -- Step 5: Create new role_defaults table with simplified roles
    -- =========================================================================
    CREATE TABLE role_defaults_new (
      role                TEXT    PRIMARY KEY
                          CHECK(role IN ('admin', 'user', 'guest')),
      daily_token_limit   INTEGER NOT NULL,
      monthly_token_limit INTEGER NOT NULL,
      color               TEXT    NOT NULL,
      display_order       INTEGER NOT NULL,
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- =========================================================================
    -- Step 6: Copy role_defaults data (only admin, user, guest)
    -- Use editor's settings for the new 'user' role
    -- =========================================================================
    INSERT INTO role_defaults_new (role, daily_token_limit, monthly_token_limit, color, display_order, updated_at)
    SELECT role, daily_token_limit, monthly_token_limit, color, display_order, updated_at
    FROM role_defaults
    WHERE role = 'admin';

    -- Insert 'user' role with editor's limits (or default if not found)
    INSERT INTO role_defaults_new (role, daily_token_limit, monthly_token_limit, color, display_order, updated_at)
    SELECT 'user',
           COALESCE((SELECT daily_token_limit FROM role_defaults WHERE role = 'editor'), 500000),
           COALESCE((SELECT monthly_token_limit FROM role_defaults WHERE role = 'editor'), 10000000),
           'amber',
           2,
           datetime('now');

    -- Insert guest role
    INSERT INTO role_defaults_new (role, daily_token_limit, monthly_token_limit, color, display_order, updated_at)
    SELECT role, daily_token_limit, monthly_token_limit, color, 3, updated_at
    FROM role_defaults
    WHERE role = 'guest';

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

  console.log('[Migration 007] Role merge complete:');
  roleCounts.forEach(({ role, count }) => {
    console.log(`  - ${role}: ${count} user(s)`);
  });

  const roleDefaults = db.prepare(`SELECT role FROM role_defaults ORDER BY display_order`).all();
  console.log('[Migration 007] Role defaults now:', roleDefaults.map(r => r.role).join(', '));
}

module.exports = { up };
