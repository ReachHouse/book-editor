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
 * recreate the tables with the new constraint. Uses the RENAME-old + CREATE-new
 * pattern (instead of CREATE-new + DROP-old + RENAME-new) to avoid schema
 * validation issues with some SQLite versions.
 *
 * =============================================================================
 */

'use strict';

/**
 * Run the migration.
 *
 * Each SQL statement is executed individually with logging between steps,
 * so Docker logs show exactly which step fails if there's an error.
 * All statements run within the same transaction (managed by the migration runner).
 *
 * @param {import('better-sqlite3').Database} db
 */
function up(db) {
  // Count affected users for diagnostic logging
  const restrictedCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'restricted'`).get().count;
  const totalCount = db.prepare(`SELECT COUNT(*) as count FROM users`).get().count;

  console.log(`[Migration 006] Renaming 'restricted' to 'guest':`);
  console.log(`  - ${restrictedCount} restricted user(s) out of ${totalCount} total`);

  // Log all current roles for diagnostics
  const currentRoles = db.prepare(`SELECT role, COUNT(*) as count FROM users GROUP BY role`).all();
  console.log(`  - Current roles: ${currentRoles.map(r => `${r.role}=${r.count}`).join(', ')}`);

  // =========================================================================
  // USERS TABLE: Rename old → Create new → Copy → Drop old
  // =========================================================================

  console.log('[Migration 006] Step 1/9: Renaming users → users_old');
  db.exec(`ALTER TABLE users RENAME TO users_old`);

  console.log('[Migration 006] Step 2/9: Creating new users table');
  db.exec(`
    CREATE TABLE users (
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
    )
  `);

  console.log('[Migration 006] Step 3/9: Copying users with role conversion');
  db.exec(`
    INSERT INTO users (
      id, username, email, password_hash, role, is_active,
      daily_token_limit, monthly_token_limit,
      created_at, updated_at, last_login_at,
      failed_login_attempts, locked_until
    )
    SELECT
      id, username, email, password_hash,
      CASE
        WHEN role = 'restricted' THEN 'guest'
        WHEN role = 'admin' THEN 'admin'
        WHEN role = 'management' THEN 'management'
        WHEN role = 'editor' THEN 'editor'
        ELSE 'editor'
      END,
      is_active, daily_token_limit, monthly_token_limit,
      created_at, updated_at, last_login_at,
      failed_login_attempts, locked_until
    FROM users_old
  `);

  console.log('[Migration 006] Step 4/9: Recreating user indexes');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  console.log('[Migration 006] Step 5/9: Dropping users_old');
  db.exec(`DROP TABLE users_old`);

  // =========================================================================
  // ROLE_DEFAULTS TABLE: Same pattern
  // =========================================================================

  console.log('[Migration 006] Step 6/9: Renaming role_defaults → role_defaults_old');
  db.exec(`ALTER TABLE role_defaults RENAME TO role_defaults_old`);

  console.log('[Migration 006] Step 7/9: Creating new role_defaults table');
  db.exec(`
    CREATE TABLE role_defaults (
      role                TEXT    PRIMARY KEY
                          CHECK(role IN ('admin', 'management', 'editor', 'guest')),
      daily_token_limit   INTEGER NOT NULL,
      monthly_token_limit INTEGER NOT NULL,
      color               TEXT    NOT NULL,
      display_order       INTEGER NOT NULL,
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  console.log('[Migration 006] Step 8/9: Copying role_defaults with role conversion');
  db.exec(`
    INSERT INTO role_defaults (role, daily_token_limit, monthly_token_limit, color, display_order, updated_at)
    SELECT
      CASE
        WHEN role = 'restricted' THEN 'guest'
        WHEN role = 'admin' THEN 'admin'
        WHEN role = 'management' THEN 'management'
        WHEN role = 'editor' THEN 'editor'
        ELSE role
      END,
      daily_token_limit,
      monthly_token_limit,
      color,
      display_order,
      updated_at
    FROM role_defaults_old
  `);

  console.log('[Migration 006] Step 9/9: Dropping role_defaults_old');
  db.exec(`DROP TABLE role_defaults_old`);

  // Log migration summary
  const roleCounts = db.prepare(`SELECT role, COUNT(*) as count FROM users GROUP BY role`).all();
  console.log('[Migration 006] Complete. Users:', roleCounts.map(r => `${r.role}=${r.count}`).join(', '));

  const roleDefaults = db.prepare(`SELECT role FROM role_defaults ORDER BY display_order`).all();
  console.log('[Migration 006] Role defaults:', roleDefaults.map(r => r.role).join(', '));
}

module.exports = { up };
