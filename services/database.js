/**
 * Database Service — SQLite layer (better-sqlite3) for users, sessions,
 * invite codes, usage logs, and projects. Auto-runs versioned migrations on init.
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/app');

// Default database path — overridable via DB_PATH env var or init() argument.
// In Docker, this should be inside a mounted volume (/app/data/).
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'book-editor.db');

// Migrations directory
const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

/**
 * Database service singleton.
 */
class DatabaseService {
  constructor() {
    /** @type {import('better-sqlite3').Database|null} */
    this.db = null;
    this.initialized = false;
  }

  // --- Initialization ---

  /**
   * Initialize the database connection, run migrations, and seed defaults.
   *
   * @param {string} [dbPath] - Override database file path (for testing)
   * @returns {void}
   */
  init(dbPath) {
    if (this.initialized) return;

    const resolvedPath = dbPath || process.env.DB_PATH || DEFAULT_DB_PATH;

    // Ensure the data directory exists
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database with WAL mode for better concurrent read performance
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Run pending migrations
    this._runMigrations();

    // Note: No default seeding - first admin is created via /api/setup/complete
    // This ensures no hardcoded credentials exist in the codebase

    this.initialized = true;
  }

  /**
   * Close the database connection. Call during graceful shutdown.
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  // --- Migration System ---

  /**
   * Run all pending migrations in order.
   * Tracks applied migrations in a schema_version table.
   *
   * @private
   */
  _runMigrations() {
    // Create the schema version tracking table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version   INTEGER PRIMARY KEY,
        name      TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Get already-applied migration versions
    const applied = new Set(
      this.db.prepare('SELECT version FROM schema_version').all().map(r => r.version)
    );

    // Load migration files sorted by number
    if (!fs.existsSync(MIGRATIONS_DIR)) return;

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.js') && /^\d{3}_/.test(f))
      .sort();

    // Filter to only pending migrations
    const pending = files.filter(file => {
      const version = parseInt(file.split('_')[0], 10);
      return !applied.has(version);
    });

    if (pending.length === 0) return;

    // Disable foreign keys for the duration of migrations.
    // SQLite requires this for DROP TABLE + RENAME migrations when other
    // tables have foreign key references to the table being recreated.
    // See: https://www.sqlite.org/lang_altertable.html#otheralter
    // PRAGMA foreign_keys cannot be changed inside a transaction.
    this.db.pragma('foreign_keys = OFF');

    try {
      for (const file of pending) {
        const version = parseInt(file.split('_')[0], 10);
        const migration = require(path.join(MIGRATIONS_DIR, file));

        // Run migration inside a transaction for atomicity
        const runMigration = this.db.transaction(() => {
          migration.up(this.db);
          this.db.prepare(
            'INSERT INTO schema_version (version, name) VALUES (?, ?)'
          ).run(version, file);
        });

        runMigration();
        console.log(`  Migration ${file} applied`);
      }

      // Verify foreign key integrity after all migrations complete
      const fkErrors = this.db.pragma('foreign_key_check');
      if (fkErrors.length > 0) {
        throw new Error(
          `Foreign key integrity check failed after migrations: ${fkErrors.length} violation(s)`
        );
      }
    } finally {
      // Re-enable foreign keys regardless of success or failure
      this.db.pragma('foreign_keys = ON');
    }
  }

  // --- Users ---

  /**
   * User query helpers.
   */
  get users() {
    const db = this.db;
    return {
      /**
       * Find a user by ID.
       * @param {number} id
       * @returns {Object|undefined}
       */
      findById(id) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      },

      /**
       * Find a user by email (case-insensitive).
       * @param {string} email
       * @returns {Object|undefined}
       */
      findByEmail(email) {
        return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      },

      /**
       * Find a user by username (case-insensitive).
       * @param {string} username
       * @returns {Object|undefined}
       */
      findByUsername(username) {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      },

      /**
       * Find a user by email or username.
       * @param {string} identifier - Email or username
       * @returns {Object|undefined}
       */
      findByEmailOrUsername(identifier) {
        return db.prepare(
          'SELECT * FROM users WHERE email = ? OR username = ?'
        ).get(identifier, identifier);
      },

      /**
       * Create a new user.
       * @param {Object} data - { username, email, password_hash, role?, daily_token_limit?, monthly_token_limit? }
       * @returns {Object} The created user
       */
      create({ username, email, password_hash, role = 'user', daily_token_limit, monthly_token_limit }) {
        // If limits not provided, use defaults from centralized config
        const dailyLimit = daily_token_limit !== undefined ? daily_token_limit : config.TOKEN_LIMITS.DEFAULT_DAILY;
        const monthlyLimit = monthly_token_limit !== undefined ? monthly_token_limit : config.TOKEN_LIMITS.DEFAULT_MONTHLY;

        const result = db.prepare(`
          INSERT INTO users (username, email, password_hash, role, daily_token_limit, monthly_token_limit)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(username, email, password_hash, role, dailyLimit, monthlyLimit);
        return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      },

      /**
       * Update a user's fields.
       * @param {number} id
       * @param {Object} fields - Key-value pairs to update
       * @returns {Object|undefined} Updated user
       */
      update(id, fields) {
        const allowed = [
          'username', 'email', 'password_hash', 'role', 'is_active',
          'daily_token_limit', 'monthly_token_limit', 'last_login_at',
          'failed_login_attempts', 'locked_until', 'updated_at'
        ];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(fields)) {
          if (allowed.includes(key)) {
            updates.push(`${key} = ?`);
            values.push(value);
          }
        }

        if (updates.length === 0) return this.findById(id);

        // Always update the updated_at timestamp (unless explicitly provided)
        if (!Object.prototype.hasOwnProperty.call(fields, 'updated_at')) {
          updates.push("updated_at = datetime('now')");
        }

        values.push(id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      },

      /**
       * Delete a user and all their data (cascades via FK).
       * @param {number} id
       * @returns {boolean} True if deleted
       */
      delete(id) {
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
      },

      /**
       * List all users, sorted by creation date.
       * @returns {Array}
       */
      listAll() {
        return db.prepare(
          'SELECT id, username, email, role, is_active, daily_token_limit, monthly_token_limit, created_at, last_login_at FROM users ORDER BY created_at DESC'
        ).all();
      },

      /**
       * Count total users.
       * @returns {number}
       */
      count() {
        return db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
      }
    };
  }

  // --- Invite Codes ---

  /**
   * Invite code query helpers.
   */
  get inviteCodes() {
    const db = this.db;
    return {
      /**
       * Find an invite code by its code string.
       * @param {string} code
       * @returns {Object|undefined}
       */
      findByCode(code) {
        return db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(code);
      },

      /**
       * Create a new invite code.
       * @param {string} code
       * @param {number} createdBy - User ID of the admin who created it
       * @returns {Object} The created invite code
       */
      create(code, createdBy) {
        const result = db.prepare(
          'INSERT INTO invite_codes (code, created_by) VALUES (?, ?)'
        ).run(code, createdBy);
        return db.prepare('SELECT * FROM invite_codes WHERE id = ?').get(result.lastInsertRowid);
      },

      /**
       * Mark an invite code as used.
       * @param {string} code
       * @param {number} usedBy - User ID of the person who used it
       * @returns {boolean} True if marked
       */
      markUsed(code, usedBy) {
        const result = db.prepare(`
          UPDATE invite_codes
          SET is_used = 1, used_by = ?, used_at = datetime('now')
          WHERE code = ? AND is_used = 0
        `).run(usedBy, code);
        return result.changes > 0;
      },

      /**
       * List all invite codes.
       * @returns {Array}
       */
      listAll() {
        return db.prepare(
          'SELECT * FROM invite_codes ORDER BY created_at DESC'
        ).all();
      },

      /**
       * Check if a code is valid (exists and unused).
       * @param {string} code
       * @returns {boolean}
       */
      isValid(code) {
        const row = db.prepare(
          'SELECT id FROM invite_codes WHERE code = ? AND is_used = 0'
        ).get(code);
        return !!row;
      },

      /**
       * Delete an unused invite code by ID.
       * @param {number} id - Invite code ID
       * @returns {boolean} True if deleted, false if not found or already used
       */
      deleteUnused(id) {
        const result = db.prepare(
          'DELETE FROM invite_codes WHERE id = ? AND is_used = 0'
        ).run(id);
        return result.changes > 0;
      }
    };
  }

  // --- Sessions ---

  /**
   * Session (refresh token) query helpers.
   */
  get sessions() {
    const db = this.db;
    return {
      /**
       * Create a new session.
       * @param {number} userId
       * @param {string} refreshToken
       * @param {string} expiresAt - ISO date string
       * @returns {Object}
       */
      create(userId, refreshToken, expiresAt) {
        const result = db.prepare(
          'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)'
        ).run(userId, refreshToken, expiresAt);
        return db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
      },

      /**
       * Find a session by refresh token.
       * @param {string} refreshToken
       * @returns {Object|undefined}
       */
      findByToken(refreshToken) {
        return db.prepare(
          'SELECT * FROM sessions WHERE refresh_token = ?'
        ).get(refreshToken);
      },

      /**
       * Delete a specific session (logout).
       * @param {string} refreshToken
       * @returns {boolean}
       */
      deleteByToken(refreshToken) {
        const result = db.prepare(
          'DELETE FROM sessions WHERE refresh_token = ?'
        ).run(refreshToken);
        return result.changes > 0;
      },

      /**
       * Delete all sessions for a user (logout everywhere / password change).
       * @param {number} userId
       * @returns {number} Number of sessions deleted
       */
      deleteAllForUser(userId) {
        const result = db.prepare(
          'DELETE FROM sessions WHERE user_id = ?'
        ).run(userId);
        return result.changes;
      },

      /**
       * Delete expired sessions (cleanup).
       * @returns {number} Number of sessions deleted
       */
      deleteExpired() {
        const result = db.prepare(
          "DELETE FROM sessions WHERE expires_at < datetime('now')"
        ).run();
        return result.changes;
      }
    };
  }

  // --- Usage Logs ---

  /**
   * Usage log query helpers.
   */
  get usageLogs() {
    const db = this.db;
    return {
      /**
       * Log an API call.
       * @param {Object} data - { userId, endpoint, tokensInput, tokensOutput, model?, projectId? }
       * @returns {Object}
       */
      create({ userId, endpoint, tokensInput = 0, tokensOutput = 0, model, projectId }) {
        const result = db.prepare(`
          INSERT INTO usage_logs (user_id, endpoint, tokens_input, tokens_output, model, project_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, endpoint, tokensInput, tokensOutput, model || null, projectId || null);
        return db.prepare('SELECT * FROM usage_logs WHERE id = ?').get(result.lastInsertRowid);
      },

      /**
       * Get a user's total token usage for today.
       * @param {number} userId
       * @returns {{ input: number, output: number, total: number }}
       */
      getDailyUsage(userId) {
        const row = db.prepare(`
          SELECT
            COALESCE(SUM(tokens_input), 0) AS input,
            COALESCE(SUM(tokens_output), 0) AS output
          FROM usage_logs
          WHERE user_id = ? AND created_at >= date('now')
        `).get(userId);
        return { input: row.input, output: row.output, total: row.input + row.output };
      },

      /**
       * Get a user's total token usage for the current month.
       * @param {number} userId
       * @returns {{ input: number, output: number, total: number }}
       */
      getMonthlyUsage(userId) {
        const row = db.prepare(`
          SELECT
            COALESCE(SUM(tokens_input), 0) AS input,
            COALESCE(SUM(tokens_output), 0) AS output
          FROM usage_logs
          WHERE user_id = ? AND created_at >= date('now', 'start of month')
        `).get(userId);
        return { input: row.input, output: row.output, total: row.input + row.output };
      },

      /**
       * Get recent usage history for a user.
       * @param {number} userId
       * @param {number} [limit=50]
       * @returns {Array}
       */
      getHistory(userId, limit = 50) {
        return db.prepare(`
          SELECT * FROM usage_logs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `).all(userId, limit);
      },

      /**
       * Get system-wide usage stats.
       * @returns {{ totalCalls: number, totalTokens: number, uniqueUsers: number }}
       */
      getSystemStats() {
        const row = db.prepare(`
          SELECT
            COUNT(*) AS totalCalls,
            COALESCE(SUM(tokens_input + tokens_output), 0) AS totalTokens,
            COUNT(DISTINCT user_id) AS uniqueUsers
          FROM usage_logs
        `).get();
        return row;
      },

      /**
       * Get daily usage for ALL users in a single query.
       * Returns a Map of userId -> { input, output, total }
       * @returns {Map<number, { input: number, output: number, total: number }>}
       */
      getAllDailyUsage() {
        const rows = db.prepare(`
          SELECT
            user_id,
            COALESCE(SUM(tokens_input), 0) AS input,
            COALESCE(SUM(tokens_output), 0) AS output
          FROM usage_logs
          WHERE created_at >= date('now')
          GROUP BY user_id
        `).all();
        const map = new Map();
        for (const row of rows) {
          map.set(row.user_id, {
            input: row.input,
            output: row.output,
            total: row.input + row.output
          });
        }
        return map;
      },

      /**
       * Get monthly usage for ALL users in a single query.
       * Returns a Map of userId -> { input, output, total }
       * @returns {Map<number, { input: number, output: number, total: number }>}
       */
      getAllMonthlyUsage() {
        const rows = db.prepare(`
          SELECT
            user_id,
            COALESCE(SUM(tokens_input), 0) AS input,
            COALESCE(SUM(tokens_output), 0) AS output
          FROM usage_logs
          WHERE created_at >= date('now', 'start of month')
          GROUP BY user_id
        `).all();
        const map = new Map();
        for (const row of rows) {
          map.set(row.user_id, {
            input: row.input,
            output: row.output,
            total: row.input + row.output
          });
        }
        return map;
      }
    };
  }

  // --- Projects ---

  /**
   * Project query helpers.
   */
  get projects() {
    const db = this.db;
    return {
      /**
       * List projects for a user (metadata only, no large text fields).
       * Sorted by updated_at descending (newest first).
       * Supports pagination with limit/offset.
       *
       * @param {number} userId
       * @param {number} [limit] - Max results (omit for all)
       * @param {number} [offset=0] - Skip this many results
       * @returns {Array}
       */
      listByUser(userId, limit, offset = 0) {
        if (limit !== undefined) {
          return db.prepare(`
            SELECT id, user_id, file_name, is_complete, chunks_completed,
                   total_chunks, chunk_size, created_at, updated_at
            FROM projects
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
          `).all(userId, limit, offset);
        }
        return db.prepare(`
          SELECT id, user_id, file_name, is_complete, chunks_completed,
                 total_chunks, chunk_size, created_at, updated_at
          FROM projects
          WHERE user_id = ?
          ORDER BY updated_at DESC
        `).all(userId);
      },

      /**
       * Get a single project with all data (including large text fields).
       *
       * @param {string} id - Project ID
       * @param {number} userId - Owner's user ID
       * @returns {Object|undefined}
       */
      findById(id, userId) {
        return db.prepare(
          'SELECT * FROM projects WHERE id = ? AND user_id = ?'
        ).get(id, userId);
      },

      /**
       * Count total projects for a user (for pagination).
       *
       * @param {number} userId
       * @returns {number}
       */
      count(userId) {
        const row = db.prepare(
          'SELECT COUNT(*) as count FROM projects WHERE user_id = ?'
        ).get(userId);
        return row ? row.count : 0;
      },

      /**
       * Save (upsert) a project. Creates if new, updates if existing.
       *
       * @param {number} userId
       * @param {Object} data - Project data
       * @returns {Object} The saved project (metadata only)
       */
      save(userId, data) {
        const {
          id, fileName, isComplete = false, chunksCompleted = 0,
          totalChunks = 0, chunkSize = 2000, originalText = null,
          editedChunks = null, fullEditedText = null,
          styleGuide = null, docContent = null, customStyleGuide = null
        } = data;

        // Serialize arrays/objects to JSON strings (with error handling)
        let editedChunksJson = null;
        let docContentJson = null;
        try {
          editedChunksJson = editedChunks ? JSON.stringify(editedChunks) : null;
          docContentJson = docContent ? JSON.stringify(docContent) : null;
        } catch (err) {
          throw new Error(`Failed to serialize project data: ${err.message}`);
        }

        db.prepare(`
          INSERT INTO projects (
            id, user_id, file_name, is_complete, chunks_completed,
            total_chunks, chunk_size, original_text, edited_chunks,
            full_edited_text, style_guide, doc_content, custom_style_guide
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id, user_id) DO UPDATE SET
            file_name = excluded.file_name,
            is_complete = excluded.is_complete,
            chunks_completed = excluded.chunks_completed,
            total_chunks = excluded.total_chunks,
            chunk_size = excluded.chunk_size,
            original_text = excluded.original_text,
            edited_chunks = excluded.edited_chunks,
            full_edited_text = excluded.full_edited_text,
            style_guide = excluded.style_guide,
            doc_content = excluded.doc_content,
            custom_style_guide = excluded.custom_style_guide,
            updated_at = datetime('now')
        `).run(
          id, userId, fileName, isComplete ? 1 : 0, chunksCompleted,
          totalChunks, chunkSize, originalText, editedChunksJson,
          fullEditedText, styleGuide, docContentJson, customStyleGuide
        );

        const saved = db.prepare(`
          SELECT id, user_id, file_name, is_complete, chunks_completed,
                 total_chunks, chunk_size, created_at, updated_at
          FROM projects WHERE id = ? AND user_id = ?
        `).get(id, userId);

        if (!saved) {
          throw new Error('Failed to save project: record not found after upsert');
        }

        return saved;
      },

      /**
       * Delete a project.
       *
       * @param {string} id - Project ID
       * @param {number} userId - Owner's user ID
       * @returns {boolean} True if deleted
       */
      delete(id, userId) {
        const result = db.prepare(
          'DELETE FROM projects WHERE id = ? AND user_id = ?'
        ).run(id, userId);
        return result.changes > 0;
      },

      /**
       * Get project counts for ALL users in a single query.
       * Returns a Map of userId -> count
       * @returns {Map<number, number>}
       */
      getAllCounts() {
        const rows = db.prepare(`
          SELECT user_id, COUNT(*) AS count
          FROM projects
          GROUP BY user_id
        `).all();
        const map = new Map();
        for (const row of rows) {
          map.set(row.user_id, row.count);
        }
        return map;
      }
    };
  }

  // --- Role Defaults ---

  /**
   * Role defaults query helpers.
   * Manages configurable default token limits per role.
   */
  get roleDefaults() {
    const db = this.db;
    return {
      /**
       * Get defaults for a specific role.
       * @param {string} role - 'admin' or 'user'
       * @returns {Object|undefined}
       */
      get(role) {
        return db.prepare('SELECT * FROM role_defaults WHERE role = ?').get(role);
      },

      /**
       * List all role defaults, ordered by display_order.
       * @returns {Array}
       */
      listAll() {
        return db.prepare(
          'SELECT * FROM role_defaults ORDER BY display_order'
        ).all();
      },

      /**
       * Update role defaults.
       * @param {string} role
       * @param {Object} fields - { daily_token_limit?, monthly_token_limit? }
       * @returns {Object|undefined} Updated role defaults
       */
      update(role, fields) {
        const allowed = ['daily_token_limit', 'monthly_token_limit'];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(fields)) {
          if (allowed.includes(key)) {
            updates.push(`${key} = ?`);
            values.push(value);
          }
        }

        if (updates.length === 0) return this.get(role);

        // Always update the updated_at timestamp
        updates.push("updated_at = datetime('now')");

        values.push(role);
        db.prepare(
          `UPDATE role_defaults SET ${updates.join(', ')} WHERE role = ?`
        ).run(...values);

        return this.get(role);
      }
    };
  }

  // --- Raw Access ---

  /**
   * Get the raw better-sqlite3 database instance.
   * Use for custom queries not covered by the helpers above.
   *
   * @returns {import('better-sqlite3').Database}
   */
  getDb() {
    return this.db;
  }

  /**
   * Run a function inside a database transaction.
   * Automatically commits on success, rolls back on error.
   *
   * @param {Function} fn - Function to execute inside transaction
   * @returns {*} Return value of fn
   */
  transaction(fn) {
    return this.db.transaction(fn)();
  }
}

// Export singleton instance
const database = new DatabaseService();
module.exports = { database, DatabaseService };
