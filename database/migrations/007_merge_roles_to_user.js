/**
 * =============================================================================
 * MIGRATION 007: Merge 'management' and 'editor' roles into 'user'
 * =============================================================================
 *
 * Simplifies the role system from 4 roles to 2 roles:
 * - admin: Full access, unlimited tokens
 * - user: Standard access (replaces management, editor, and guest)
 *
 * NOTE: 'guest' is not a database role — it is a frontend-only browsing mode
 * for unauthenticated users who skip registration (see GUEST_USER in frontend).
 *
 * CHANGES:
 * - Updates role CHECK constraint in users table: ('admin', 'user')
 * - Migrates all users with role='management', 'editor', or 'guest' to role='user'
 * - Updates role CHECK constraint in role_defaults table
 * - Removes 'management', 'editor', and 'guest' rows from role_defaults
 * - Keeps 'user' role defaults (500K daily, 10M monthly)
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
  const managementCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'management'`).get().count;
  const editorCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'editor'`).get().count;
  const guestCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'guest'`).get().count;

  console.log(`[Migration 007] Merging roles into 'user':`);
  console.log(`  - ${managementCount} management, ${editorCount} editor, ${guestCount} guest user(s)`);

  // =========================================================================
  // USERS TABLE: Rename old → Create new → Copy → Drop old
  // =========================================================================

  console.log('[Migration 007] Step 1/9: Renaming users → users_old');
  db.exec(`ALTER TABLE users RENAME TO users_old`);

  console.log('[Migration 007] Step 2/9: Creating new users table');
  db.exec(`
    CREATE TABLE users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash   TEXT    NOT NULL,
      role            TEXT    NOT NULL DEFAULT 'user'
                      CHECK(role IN ('admin', 'user')),
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

  console.log('[Migration 007] Step 3/9: Copying users with role conversion');
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
        WHEN role = 'management' THEN 'user'
        WHEN role = 'editor' THEN 'user'
        WHEN role = 'guest' THEN 'user'
        ELSE 'user'
      END,
      is_active, daily_token_limit, monthly_token_limit,
      created_at, updated_at, last_login_at,
      failed_login_attempts, locked_until
    FROM users_old
  `);

  console.log('[Migration 007] Step 4/9: Recreating user indexes');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  console.log('[Migration 007] Step 5/9: Dropping users_old');
  db.exec(`DROP TABLE users_old`);

  // =========================================================================
  // ROLE_DEFAULTS TABLE: Read into JS → Drop → Create → Insert programmatically
  //
  // Using programmatic inserts instead of INSERT INTO...SELECT FROM to avoid
  // SQLite schema cache issues when multiple DDL ops happen in one transaction.
  // =========================================================================

  console.log('[Migration 007] Step 6/9: Reading role_defaults into memory');
  const roleDefaultRows = db.prepare(`SELECT * FROM role_defaults`).all();
  console.log(`  - Read ${roleDefaultRows.length} rows: ${roleDefaultRows.map(r => r.role).join(', ')}`);

  console.log('[Migration 007] Step 7/9: Dropping role_defaults table');
  db.exec(`DROP TABLE role_defaults`);

  console.log('[Migration 007] Step 8/9: Creating new role_defaults table');
  db.exec(`
    CREATE TABLE role_defaults (
      role                TEXT    PRIMARY KEY
                          CHECK(role IN ('admin', 'user')),
      daily_token_limit   INTEGER NOT NULL,
      monthly_token_limit INTEGER NOT NULL,
      color               TEXT    NOT NULL,
      display_order       INTEGER NOT NULL,
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  console.log('[Migration 007] Step 9/9: Inserting role_defaults (admin + user only)');
  const insertDefault = db.prepare(`
    INSERT INTO role_defaults (role, daily_token_limit, monthly_token_limit, color, display_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Insert admin row from memory (if found)
  const adminRow = roleDefaultRows.find(r => r.role === 'admin');
  if (adminRow) {
    insertDefault.run('admin', adminRow.daily_token_limit, adminRow.monthly_token_limit, adminRow.color, adminRow.display_order, adminRow.updated_at);
    console.log(`  - Inserted: admin`);
  }

  // Insert 'user' role with editor's limits (or defaults if editor row not found)
  const editorRow = roleDefaultRows.find(r => r.role === 'editor');
  const now = db.prepare(`SELECT datetime('now') as now`).get().now;
  insertDefault.run(
    'user',
    editorRow ? editorRow.daily_token_limit : 500000,
    editorRow ? editorRow.monthly_token_limit : 10000000,
    'amber',
    2,
    now
  );
  console.log(`  - Inserted: user (from editor defaults)`);

  // Log migration summary
  const roleCounts = db.prepare(`SELECT role, COUNT(*) as count FROM users GROUP BY role`).all();
  console.log('[Migration 007] Complete. Users:', roleCounts.map(r => `${r.role}=${r.count}`).join(', '));

  const roleDefaults = db.prepare(`SELECT role FROM role_defaults ORDER BY display_order`).all();
  console.log('[Migration 007] Role defaults:', roleDefaults.map(r => r.role).join(', '));
}

module.exports = { up };
