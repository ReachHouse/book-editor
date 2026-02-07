/**
 * =============================================================================
 * MIGRATION 009: Fix stale foreign key references to 'users_old'
 * =============================================================================
 *
 * PROBLEM: During earlier failed deployment attempts (Feb 2026), migration 006
 * ran `ALTER TABLE users RENAME TO users_old` while `PRAGMA foreign_keys = ON`.
 * This caused SQLite to rewrite FK references in dependent tables (sessions,
 * invite_codes, usage_logs, projects) from `REFERENCES users(id)` to
 * `REFERENCES users_old(id)`. When the migration failed and the transaction
 * rolled back, the FK rewrites persisted (or were re-applied across multiple
 * failed attempts). Subsequent successful migrations dropped `users_old`,
 * leaving these tables with FK references to a non-existent table.
 *
 * SYMPTOM: Login succeeds (SELECT from users works) but creating a session
 * fails with "no such table: main.users_old" because the sessions INSERT
 * triggers FK validation against the non-existent users_old table.
 *
 * FIX: Check sqlite_master for tables with stale `users_old` references.
 * For each affected table, read data into JS memory, DROP + CREATE with
 * correct FK references, and re-insert programmatically.
 *
 * This migration is idempotent: if no stale references exist, it does nothing.
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
  // Check which tables have stale FK references to users_old
  const stale = db.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%users_old%'"
  ).all();

  if (stale.length === 0) {
    console.log('[Migration 009] No stale users_old FK references found — nothing to fix');
    return;
  }

  const staleNames = stale.map(t => t.name);
  console.log(`[Migration 009] Found ${stale.length} table(s) with stale users_old FK: ${staleNames.join(', ')}`);

  // --- Fix sessions table ---
  if (staleNames.includes('sessions')) {
    console.log('[Migration 009] Fixing sessions table FK references');
    const rows = db.prepare('SELECT * FROM sessions').all();
    console.log(`  - Read ${rows.length} session(s)`);

    db.exec('DROP TABLE sessions');
    db.exec(`
      CREATE TABLE sessions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token TEXT    NOT NULL UNIQUE,
        expires_at    TEXT    NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');

    const insertSession = db.prepare(
      'INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    for (const r of rows) {
      insertSession.run(r.id, r.user_id, r.refresh_token, r.expires_at, r.created_at);
    }
    console.log(`  - Restored ${rows.length} session(s) with correct FK`);
  }

  // --- Fix invite_codes table ---
  if (staleNames.includes('invite_codes')) {
    console.log('[Migration 009] Fixing invite_codes table FK references');
    const rows = db.prepare('SELECT * FROM invite_codes').all();
    console.log(`  - Read ${rows.length} invite code(s)`);

    db.exec('DROP TABLE invite_codes');
    db.exec(`
      CREATE TABLE invite_codes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        code        TEXT    NOT NULL UNIQUE,
        created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
        used_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_used     INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        used_at     TEXT
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code)');

    const insertCode = db.prepare(
      'INSERT INTO invite_codes (id, code, created_by, used_by, is_used, created_at, used_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const r of rows) {
      insertCode.run(r.id, r.code, r.created_by, r.used_by, r.is_used, r.created_at, r.used_at);
    }
    console.log(`  - Restored ${rows.length} invite code(s) with correct FK`);
  }

  // --- Fix usage_logs table ---
  if (staleNames.includes('usage_logs')) {
    console.log('[Migration 009] Fixing usage_logs table FK references');
    const rows = db.prepare('SELECT * FROM usage_logs').all();
    console.log(`  - Read ${rows.length} usage log(s)`);

    db.exec('DROP TABLE usage_logs');
    db.exec(`
      CREATE TABLE usage_logs (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint      TEXT    NOT NULL,
        tokens_input  INTEGER NOT NULL DEFAULT 0,
        tokens_output INTEGER NOT NULL DEFAULT 0,
        model         TEXT,
        project_id    TEXT,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON usage_logs(user_id, created_at)');

    const insertLog = db.prepare(
      'INSERT INTO usage_logs (id, user_id, endpoint, tokens_input, tokens_output, model, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const r of rows) {
      insertLog.run(r.id, r.user_id, r.endpoint, r.tokens_input, r.tokens_output, r.model, r.project_id, r.created_at);
    }
    console.log(`  - Restored ${rows.length} usage log(s) with correct FK`);
  }

  // --- Fix projects table ---
  if (staleNames.includes('projects')) {
    console.log('[Migration 009] Fixing projects table FK references');
    const rows = db.prepare('SELECT * FROM projects').all();
    console.log(`  - Read ${rows.length} project(s)`);

    db.exec('DROP TABLE projects');
    db.exec(`
      CREATE TABLE projects (
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
        custom_style_guide TEXT,
        created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (id, user_id)
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id, updated_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC)');

    const insertProject = db.prepare(`
      INSERT INTO projects (id, user_id, file_name, is_complete, chunks_completed,
        total_chunks, chunk_size, original_text, edited_chunks, full_edited_text,
        style_guide, doc_content, custom_style_guide, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of rows) {
      insertProject.run(
        r.id, r.user_id, r.file_name, r.is_complete, r.chunks_completed,
        r.total_chunks, r.chunk_size, r.original_text, r.edited_chunks,
        r.full_edited_text, r.style_guide, r.doc_content, r.custom_style_guide,
        r.created_at, r.updated_at
      );
    }
    console.log(`  - Restored ${rows.length} project(s) with correct FK`);
  }

  // Verify no stale references remain
  const remaining = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND sql LIKE '%users_old%'"
  ).all();

  if (remaining.length > 0) {
    throw new Error(`[Migration 009] Failed to fix all stale references: ${remaining.map(t => t.name).join(', ')}`);
  }

  console.log('[Migration 009] All FK references repaired successfully');
}

module.exports = { up };
