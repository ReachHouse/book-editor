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
 * pattern for the users table and a DROP + CREATE + re-insert pattern for the
 * role_defaults table (using programmatic JS inserts to avoid schema cache issues
 * with INSERT INTO ... SELECT FROM across multiple DDL ops in one transaction).
 *
 * =============================================================================
 */

'use strict';

const VALID_ROLES_NEW = ['admin', 'management', 'editor', 'guest'];

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
  const currentUserRoles = db.prepare(`SELECT role, COUNT(*) as count FROM users GROUP BY role`).all();
  console.log(`  - Current user roles: ${currentUserRoles.map(r => `${r.role}=${r.count}`).join(', ')}`);

  // Log role_defaults contents for diagnostics
  const currentDefaults = db.prepare(`SELECT role, daily_token_limit, monthly_token_limit FROM role_defaults`).all();
  console.log(`  - Current role_defaults (${currentDefaults.length} rows): ${currentDefaults.map(r => r.role).join(', ')}`);

  // =========================================================================
  // USERS TABLE: Rename old → Create new → Copy → Drop old
  // =========================================================================

  console.log('[Migration 006] Step 1/8: Renaming users → users_old');
  db.exec(`ALTER TABLE users RENAME TO users_old`);

  console.log('[Migration 006] Step 2/8: Creating new users table');
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

  console.log('[Migration 006] Step 3/8: Copying users with role conversion');
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

  console.log('[Migration 006] Step 4/8: Recreating user indexes');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  console.log('[Migration 006] Step 5/8: Dropping users_old');
  db.exec(`DROP TABLE users_old`);

  // =========================================================================
  // ROLE_DEFAULTS TABLE: Read into JS → Drop → Create → Insert programmatically
  //
  // Using programmatic inserts instead of INSERT INTO...SELECT FROM to avoid
  // SQLite schema cache issues when multiple DDL ops happen in one transaction.
  // =========================================================================

  console.log('[Migration 006] Step 6/8: Reading role_defaults into memory');
  const roleDefaultRows = db.prepare(`SELECT * FROM role_defaults`).all();
  console.log(`  - Read ${roleDefaultRows.length} rows: ${roleDefaultRows.map(r => r.role).join(', ')}`);

  console.log('[Migration 006] Step 7/8: Dropping and recreating role_defaults table');
  db.exec(`DROP TABLE role_defaults`);
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

  console.log('[Migration 006] Step 8/8: Inserting role_defaults with role conversion');
  const insertDefault = db.prepare(`
    INSERT INTO role_defaults (role, daily_token_limit, monthly_token_limit, color, display_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const row of roleDefaultRows) {
    // Convert restricted → guest, keep valid roles, skip unexpected ones
    let newRole = row.role;
    if (newRole === 'restricted') {
      newRole = 'guest';
    }

    if (VALID_ROLES_NEW.includes(newRole)) {
      insertDefault.run(newRole, row.daily_token_limit, row.monthly_token_limit, row.color, row.display_order, row.updated_at);
      console.log(`  - Inserted: ${row.role} → ${newRole}`);
    } else {
      console.log(`  - Skipped unexpected role: '${row.role}'`);
    }
  }

  // Log migration summary
  const roleCounts = db.prepare(`SELECT role, COUNT(*) as count FROM users GROUP BY role`).all();
  console.log('[Migration 006] Complete. Users:', roleCounts.map(r => `${r.role}=${r.count}`).join(', '));

  const roleDefaults = db.prepare(`SELECT role FROM role_defaults ORDER BY display_order`).all();
  console.log('[Migration 006] Role defaults:', roleDefaults.map(r => r.role).join(', '));
}

module.exports = { up };
