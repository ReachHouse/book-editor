/**
 * =============================================================================
 * MIGRATION 008: Add Database Indexes for Common Query Patterns
 * =============================================================================
 *
 * Adds indexes to columns frequently used in WHERE clauses, JOINs,
 * and ORDER BY to improve query performance.
 *
 * INDEXES ADDED:
 * - sessions.refresh_token (unique lookup during token refresh)
 * - sessions.user_id (cascade deletes, user session listing)
 * - sessions.expires_at (expired session cleanup)
 * - usage_logs.user_id + created_at (daily/monthly usage queries)
 * - usage_logs.created_at (system-wide stats)
 * - projects.user_id + updated_at (project listing sorted by date)
 * - invite_codes.code (invite code lookup during registration)
 *
 * NOTE: users.email and users.username indexes already exist from migration 007.
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
    -- Sessions: token lookup for refresh/logout
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token
      ON sessions(refresh_token);

    -- Sessions: find sessions by user (for logout-everywhere, cascade)
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id);

    -- Sessions: expired session cleanup query
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
      ON sessions(expires_at);

    -- Usage logs: daily/monthly usage per user (composite index)
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
      ON usage_logs(user_id, created_at);

    -- Usage logs: system-wide stats ordered by date
    CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at
      ON usage_logs(created_at);

    -- Projects: list by user sorted by updated_at
    CREATE INDEX IF NOT EXISTS idx_projects_user_updated
      ON projects(user_id, updated_at DESC);

    -- Invite codes: code lookup during registration
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code
      ON invite_codes(code);
  `);

  console.log('[Migration 008] Database indexes created for performance optimization');
}

module.exports = { up };
