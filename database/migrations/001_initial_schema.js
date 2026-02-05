/**
 * =============================================================================
 * MIGRATION 001: Initial Schema
 * =============================================================================
 *
 * Creates the foundational tables for the multi-user system:
 *
 * - users:        User accounts with roles, limits, and lockout support
 * - invite_codes: Registration requires a valid invite code
 * - sessions:     JWT refresh tokens with expiry tracking
 * - usage_logs:   Per-user AI API usage tracking
 *
 * This migration is the foundation for v1.26.0 (auth) through v1.30.0.
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
    -- USERS TABLE
    -- =========================================================================
    -- Stores user accounts. Every person who uses the app has a row here.
    -- The 'role' field controls access: 'admin' gets management endpoints,
    -- 'user' gets standard editing access.
    --
    -- Lockout fields (failed_login_attempts, locked_until) support v1.30.0
    -- security hardening but are created now to avoid future migrations.
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash   TEXT    NOT NULL,
      role            TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      is_active       INTEGER NOT NULL DEFAULT 1,
      daily_token_limit   INTEGER NOT NULL DEFAULT 500000,
      monthly_token_limit INTEGER NOT NULL DEFAULT 10000000,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      last_login_at   TEXT,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until    TEXT
    );

    -- Index for login lookups (by email or username)
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    -- =========================================================================
    -- INVITE CODES TABLE
    -- =========================================================================
    -- Registration requires a valid, unused invite code.
    -- Admins generate codes; users consume them during registration.
    -- This prevents unauthorized signups on a public URL.
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS invite_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT    NOT NULL UNIQUE,
      created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      used_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_used     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      used_at     TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

    -- =========================================================================
    -- SESSIONS TABLE
    -- =========================================================================
    -- Stores JWT refresh tokens. Access tokens are short-lived (15 min) and
    -- stateless; refresh tokens are long-lived (7 days) and revocable.
    -- On logout or password change, the session row is deleted.
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token TEXT    NOT NULL UNIQUE,
      expires_at    TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);

    -- =========================================================================
    -- USAGE LOGS TABLE
    -- =========================================================================
    -- Tracks every AI API call per user for billing, limits, and analytics.
    -- Each row is one API call (edit-chunk or generate-style-guide).
    -- Token counts come from the Anthropic API response 'usage' field.
    -- =========================================================================
    CREATE TABLE IF NOT EXISTS usage_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint      TEXT    NOT NULL,
      tokens_input  INTEGER NOT NULL DEFAULT 0,
      tokens_output INTEGER NOT NULL DEFAULT 0,
      model         TEXT,
      project_id    TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, created_at);
  `);
}

module.exports = { up };
