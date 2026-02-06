/**
 * =============================================================================
 * MIGRATION 004: Roles and Token Limits Enhancement
 * =============================================================================
 *
 * Enhances the role system with four distinct roles and updates token limit
 * semantics to support "Unlimited" (-1) and "Restricted" (0) states.
 *
 * CHANGES:
 * - Updates role CHECK constraint: ('admin', 'user') -> ('admin', 'management', 'editor', 'restricted')
 * - Migrates 'user' role to 'editor'
 * - Sets admin users to unlimited (-1) limits
 * - Converts existing 0 limits for ALL users to appropriate values:
 *   - Admin users: 0 -> -1 (unlimited)
 *   - Non-admin users: 0 -> default limits (500K/10M) to avoid breaking access
 *
 * TOKEN LIMIT SEMANTICS (NEW):
 * - -1 = Unlimited (no restrictions)
 * -  0 = Restricted (cannot use API)
 * - >0 = Specific limit (enforced)
 *
 * SECURITY NOTE: In the old system, 0 often meant "no limit set" or "use default".
 * Converting non-admin users with 0 to the restricted state would break their access.
 * This migration safely converts them to default limits instead.
 *
 * NOTE: SQLite doesn't support ALTER TABLE for CHECK constraints, so we must
 * recreate the table with the new constraint.
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
  // Check for any non-admin users with limit=0 (will be converted to defaults)
  const usersWithZeroLimit = db.prepare(`
    SELECT id, username, role, daily_token_limit, monthly_token_limit
    FROM users
    WHERE role != 'admin' AND (daily_token_limit = 0 OR monthly_token_limit = 0)
  `).all();

  if (usersWithZeroLimit.length > 0) {
    console.log('\n[Migration 004] Converting non-admin users with limit=0 to default limits:');
    usersWithZeroLimit.forEach(u => {
      console.log(`  - ${u.username} (id: ${u.id}): 0 -> 500K daily, 10M monthly`);
    });
    console.log('This prevents breaking access for users who had "no limit" in the old system.\n');
  }

  db.exec(`
    -- =========================================================================
    -- Step 1: Create new users table with updated CHECK constraint
    -- =========================================================================
    CREATE TABLE users_new (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash   TEXT    NOT NULL,
      role            TEXT    NOT NULL DEFAULT 'editor'
                      CHECK(role IN ('admin', 'management', 'editor', 'restricted')),
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
    -- Step 2: Copy data with role migration
    -- - 'user' role becomes 'editor'
    -- - 'admin' role stays 'admin'
    -- - For admin users: all get unlimited (-1)
    -- - For non-admin users with 0 limits: convert to defaults (500K/10M)
    --   This prevents breaking access for users who had "no limit" in old system
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
      CASE WHEN role = 'user' THEN 'editor' ELSE role END,
      is_active,
      CASE
        WHEN role = 'admin' THEN -1  -- All admins get unlimited
        WHEN daily_token_limit = 0 THEN 500000  -- Convert old "no limit" to default
        ELSE daily_token_limit
      END,
      CASE
        WHEN role = 'admin' THEN -1  -- All admins get unlimited
        WHEN monthly_token_limit = 0 THEN 10000000  -- Convert old "no limit" to default
        ELSE monthly_token_limit
      END,
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
  `);

  // Log migration summary
  const userCounts = db.prepare(`
    SELECT role, COUNT(*) as count FROM users GROUP BY role
  `).all();

  console.log('[Migration 004] Role migration complete:');
  userCounts.forEach(({ role, count }) => {
    console.log(`  - ${role}: ${count} user(s)`);
  });
}

module.exports = { up };
