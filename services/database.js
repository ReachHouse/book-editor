/**
 * =============================================================================
 * DATABASE SERVICE
 * =============================================================================
 *
 * Provides a SQLite database layer using better-sqlite3 for persistent
 * server-side storage of users, sessions, invite codes, and usage logs.
 *
 * WHY SQLITE:
 * -----------
 * - File-based: no external database server needed
 * - Single-file persistence with Docker volume
 * - Synchronous API (better-sqlite3) — simpler code, no callback hell
 * - More than sufficient for expected load (< 50 concurrent users)
 * - ACID transactions out of the box
 *
 * USAGE:
 * ------
 * const { database } = require('./services/database');
 *
 * // Initialize (call once at server startup)
 * database.init();
 *
 * // Use query helpers
 * const user = database.users.findByEmail('admin@example.com');
 * database.usageLogs.create({ userId: 1, endpoint: '/api/edit-chunk', ... });
 *
 * // Graceful shutdown
 * database.close();
 *
 * MIGRATIONS:
 * -----------
 * Schema changes are versioned in database/migrations/.
 * Each migration file exports an up(db) function.
 * The schema_version table tracks which migrations have been applied.
 * New migrations run automatically on init().
 *
 * =============================================================================
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

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

    // Seed initial data if tables are empty
    this._seedDefaults();

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

  // ===========================================================================
  // MIGRATION SYSTEM
  // ===========================================================================

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

    for (const file of files) {
      const version = parseInt(file.split('_')[0], 10);

      if (applied.has(version)) continue;

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
  }

  /**
   * Seed default data: admin user and initial invite code.
   * Only runs if the users table is empty (first-time setup).
   *
   * Admin credentials are set via environment variables:
   *   ADMIN_USERNAME (default: admin)
   *   ADMIN_EMAIL    (default: admin@reachpublishers.com)
   *   ADMIN_PASSWORD (default: randomly generated, printed to console)
   *
   * The initial invite code is printed to console for first user registration.
   *
   * @private
   */
  _seedDefaults() {
    const userCount = this.db.prepare('SELECT COUNT(*) AS count FROM users').get().count;

    if (userCount > 0) return;

    console.log('  Seeding initial admin user and invite code...');

    // Generate admin password if not provided
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@reachpublishers.com';
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');

    // Store password with a plain-text marker for initial seed.
    // On first admin login, authService.login() detects the "plain:" prefix
    // and re-hashes the password with bcrypt automatically.
    const passwordHash = `plain:${adminPassword}`;

    this.db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, 'admin')
    `).run(adminUsername, adminEmail, passwordHash);

    // Generate initial invite code
    const inviteCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    this.db.prepare(`
      INSERT INTO invite_codes (code, created_by) VALUES (?, 1)
    `).run(inviteCode);

    console.log('  ─────────────────────────────────────────────');
    console.log(`  Admin user created: ${adminUsername}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`  Admin password: ${adminPassword}`);
    }
    console.log(`  First invite code: ${inviteCode}`);
    console.log('  ─────────────────────────────────────────────');
  }

  // ===========================================================================
  // USERS
  // ===========================================================================

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
       * @param {Object} data - { username, email, password_hash, role? }
       * @returns {Object} The created user
       */
      create({ username, email, password_hash, role = 'user' }) {
        const result = db.prepare(`
          INSERT INTO users (username, email, password_hash, role)
          VALUES (?, ?, ?, ?)
        `).run(username, email, password_hash, role);
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

  // ===========================================================================
  // INVITE CODES
  // ===========================================================================

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
      }
    };
  }

  // ===========================================================================
  // SESSIONS
  // ===========================================================================

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

  // ===========================================================================
  // USAGE LOGS
  // ===========================================================================

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
      }
    };
  }

  // ===========================================================================
  // RAW ACCESS (for advanced queries and transactions)
  // ===========================================================================

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
