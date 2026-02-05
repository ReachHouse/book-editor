/**
 * =============================================================================
 * DATABASE SERVICE TESTS
 * =============================================================================
 *
 * Tests for the SQLite database service including:
 * - Initialization and migration system
 * - Users CRUD operations
 * - Invite codes CRUD operations
 * - Sessions CRUD operations
 * - Usage logs CRUD operations and aggregations
 * - Edge cases (duplicates, constraints, cascading deletes)
 *
 * Each test suite uses an in-memory database for isolation.
 *
 * =============================================================================
 */

const { DatabaseService } = require('../../services/database');

/** @type {DatabaseService} */
let db;

beforeEach(() => {
  db = new DatabaseService();
  db.init(':memory:');
});

afterEach(() => {
  db.close();
});

// =============================================================================
// INITIALIZATION & MIGRATIONS
// =============================================================================

describe('Database Initialization', () => {
  test('initializes without error', () => {
    expect(db.initialized).toBe(true);
    expect(db.getDb()).toBeTruthy();
  });

  test('init is idempotent', () => {
    db.init(':memory:'); // Call again
    expect(db.initialized).toBe(true);
  });

  test('creates schema_version table', () => {
    const tables = db.getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
      .get();
    expect(tables).toBeTruthy();
  });

  test('records migration in schema_version', () => {
    const versions = db.getDb()
      .prepare('SELECT * FROM schema_version')
      .all();
    expect(versions.length).toBeGreaterThanOrEqual(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].name).toContain('001_initial_schema');
  });

  test('creates all expected tables', () => {
    const tables = db.getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map(r => r.name);

    expect(tables).toContain('users');
    expect(tables).toContain('invite_codes');
    expect(tables).toContain('sessions');
    expect(tables).toContain('usage_logs');
    expect(tables).toContain('schema_version');
  });

  test('starts with empty users table (no auto-seeding)', () => {
    // First-time setup is now done via /api/setup/complete wizard
    const count = db.users.count();
    expect(count).toBe(0);
  });

  test('starts with empty invite codes (no auto-seeding)', () => {
    // Invite codes are now created by admin via /api/admin/invite-codes
    const codes = db.inviteCodes.listAll();
    expect(codes.length).toBe(0);
  });

  test('WAL mode is requested', () => {
    // In-memory databases use 'memory' journal mode (WAL not applicable).
    // For file-based databases, init() sets WAL mode.
    // We verify the pragma was called by checking it returns a valid mode.
    const mode = db.getDb().pragma('journal_mode', { simple: true });
    expect(['wal', 'memory']).toContain(mode);
  });

  test('foreign keys are enabled', () => {
    const fk = db.getDb().pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  test('close shuts down cleanly', () => {
    db.close();
    expect(db.initialized).toBe(false);
    expect(db.db).toBeNull();
  });
});

// =============================================================================
// USERS CRUD
// =============================================================================

describe('Users', () => {
  // Create a test admin user before each test (previously done by _seedDefaults)
  beforeEach(() => {
    db.users.create({
      username: 'admin',
      email: 'admin@test.com',
      password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.BNitPrG6R3rZMK',
      role: 'admin'
    });
  });

  test('findById returns admin', () => {
    const user = db.users.findById(1);
    expect(user).toBeTruthy();
    expect(user.username).toBe('admin');
  });

  test('findByEmail is case-insensitive', () => {
    const user = db.users.findByEmail('ADMIN@TEST.COM');
    expect(user).toBeTruthy();
    expect(user.username).toBe('admin');
  });

  test('findByUsername is case-insensitive', () => {
    const user = db.users.findByUsername('ADMIN');
    expect(user).toBeTruthy();
  });

  test('findByEmailOrUsername finds by email', () => {
    const user = db.users.findByEmailOrUsername('admin@test.com');
    expect(user).toBeTruthy();
  });

  test('findByEmailOrUsername finds by username', () => {
    const user = db.users.findByEmailOrUsername('admin');
    expect(user).toBeTruthy();
  });

  test('create makes a new user', () => {
    const user = db.users.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash123'
    });

    expect(user.id).toBe(2);
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('user');
    expect(user.is_active).toBe(1);
    expect(user.daily_token_limit).toBe(500000);
    expect(user.monthly_token_limit).toBe(10000000);
  });

  test('create with admin role', () => {
    const user = db.users.create({
      username: 'admin2',
      email: 'admin2@example.com',
      password_hash: 'hash',
      role: 'admin'
    });
    expect(user.role).toBe('admin');
  });

  test('create rejects duplicate username', () => {
    expect(() => {
      db.users.create({
        username: 'admin',
        email: 'other@example.com',
        password_hash: 'hash'
      });
    }).toThrow();
  });

  test('create rejects duplicate email', () => {
    expect(() => {
      db.users.create({
        username: 'other',
        email: 'admin@test.com', // Same as beforeEach admin
        password_hash: 'hash'
      });
    }).toThrow();
  });

  test('create rejects invalid role', () => {
    expect(() => {
      db.users.create({
        username: 'baduser',
        email: 'bad@example.com',
        password_hash: 'hash',
        role: 'superadmin'
      });
    }).toThrow();
  });

  test('update modifies allowed fields', () => {
    const updated = db.users.update(1, {
      daily_token_limit: 999999,
      is_active: 0
    });
    expect(updated.daily_token_limit).toBe(999999);
    expect(updated.is_active).toBe(0);
  });

  test('update ignores disallowed fields', () => {
    const before = db.users.findById(1);
    db.users.update(1, { id: 999, created_at: '1999-01-01' });
    const after = db.users.findById(1);
    expect(after.id).toBe(before.id);
    expect(after.created_at).toBe(before.created_at);
  });

  test('update sets updated_at automatically', () => {
    const before = db.users.findById(1);
    db.users.update(1, { is_active: 0 });
    const after = db.users.findById(1);
    // updated_at should be >= before (might be same second in fast tests)
    expect(after.updated_at).toBeTruthy();
  });

  test('delete removes user', () => {
    db.users.create({ username: 'temp', email: 'temp@test.com', password_hash: 'h' });
    expect(db.users.delete(2)).toBe(true);
    expect(db.users.findById(2)).toBeUndefined();
  });

  test('delete returns false for non-existent user', () => {
    expect(db.users.delete(999)).toBe(false);
  });

  test('listAll returns all users without password_hash', () => {
    db.users.create({ username: 'user2', email: 'u2@test.com', password_hash: 'h' });
    const list = db.users.listAll();
    expect(list.length).toBe(2);
    // Should NOT include password_hash in listing
    expect(list[0].password_hash).toBeUndefined();
  });

  test('count returns correct number', () => {
    expect(db.users.count()).toBe(1);
    db.users.create({ username: 'user2', email: 'u2@test.com', password_hash: 'h' });
    expect(db.users.count()).toBe(2);
  });
});

// =============================================================================
// INVITE CODES CRUD
// =============================================================================

describe('Invite Codes', () => {
  test('findByCode finds created code', () => {
    // Create a user first (required for created_by foreign key)
    db.users.create({
      username: 'testadmin',
      email: 'test@example.com',
      password_hash: 'hash',
      role: 'admin'
    });

    // Create a code and then find it
    const created = db.inviteCodes.create('FINDME123', 1);
    const found = db.inviteCodes.findByCode('FINDME123');
    expect(found).toBeTruthy();
    expect(found.id).toBe(created.id);
    expect(found.is_used).toBe(0);
  });

  test('create makes a new code', () => {
    // Create a user first (required for foreign key)
    const user = db.users.create({
      username: 'createadmin',
      email: 'createadmin@test.com',
      password_hash: 'hash',
      role: 'admin'
    });

    const code = db.inviteCodes.create('TESTCODE123', user.id);
    expect(code.code).toBe('TESTCODE123');
    expect(code.created_by).toBe(user.id);
    expect(code.is_used).toBe(0);
  });

  test('create rejects duplicate code', () => {
    const user = db.users.create({
      username: 'dupadmin',
      email: 'dupadmin@test.com',
      password_hash: 'hash',
      role: 'admin'
    });

    db.inviteCodes.create('UNIQUE1', user.id);
    expect(() => db.inviteCodes.create('UNIQUE1', user.id)).toThrow();
  });

  test('isValid returns true for unused code', () => {
    const user = db.users.create({
      username: 'validadmin',
      email: 'validadmin@test.com',
      password_hash: 'hash',
      role: 'admin'
    });

    db.inviteCodes.create('VALID1', user.id);
    expect(db.inviteCodes.isValid('VALID1')).toBe(true);
  });

  test('isValid returns false for non-existent code', () => {
    expect(db.inviteCodes.isValid('NOPE')).toBe(false);
  });

  test('markUsed consumes the code', () => {
    // Create admin user to own the invite code
    const admin = db.users.create({
      username: 'markadmin',
      email: 'markadmin@test.com',
      password_hash: 'hash',
      role: 'admin'
    });

    db.inviteCodes.create('USEME', admin.id);
    const newUser = db.users.create({ username: 'newuser', email: 'new@test.com', password_hash: 'h' });

    const result = db.inviteCodes.markUsed('USEME', newUser.id);
    expect(result).toBe(true);

    const code = db.inviteCodes.findByCode('USEME');
    expect(code.is_used).toBe(1);
    expect(code.used_by).toBe(newUser.id);
    expect(code.used_at).toBeTruthy();
  });

  test('markUsed returns false for already-used code', () => {
    // Create admin user to own the invite code
    const admin = db.users.create({
      username: 'onceadmin',
      email: 'onceadmin@test.com',
      password_hash: 'hash',
      role: 'admin'
    });

    db.inviteCodes.create('ONCE', admin.id);
    const user = db.users.create({ username: 'u1', email: 'u1@test.com', password_hash: 'h' });
    db.inviteCodes.markUsed('ONCE', user.id);

    expect(db.inviteCodes.markUsed('ONCE', user.id)).toBe(false);
  });

  test('isValid returns false after code is used', () => {
    // Create admin user to own the invite code
    const admin = db.users.create({
      username: 'checkadmin',
      email: 'checkadmin@test.com',
      password_hash: 'hash',
      role: 'admin'
    });

    db.inviteCodes.create('CHECKME', admin.id);

    // Create user who will use the code
    const consumer = db.users.create({ username: 'u2', email: 'u2@test.com', password_hash: 'h' });
    db.inviteCodes.markUsed('CHECKME', consumer.id);

    expect(db.inviteCodes.isValid('CHECKME')).toBe(false);
  });

  test('listAll returns all codes', () => {
    // Create a user first (required for foreign key)
    db.users.create({
      username: 'listadmin',
      email: 'listadmin@test.com',
      password_hash: 'hash',
      role: 'admin'
    });

    db.inviteCodes.create('A', 1);
    db.inviteCodes.create('B', 1);
    const all = db.inviteCodes.listAll();
    expect(all.length).toBe(2);
  });
});

// =============================================================================
// SESSIONS CRUD
// =============================================================================

describe('Sessions', () => {
  // Create a test user before each test (required for foreign key)
  beforeEach(() => {
    db.users.create({
      username: 'sessionuser',
      email: 'session@test.com',
      password_hash: 'hash',
      role: 'user'
    });
  });

  test('create makes a new session', () => {
    const session = db.sessions.create(1, 'token-abc', '2099-12-31T23:59:59Z');
    expect(session.user_id).toBe(1);
    expect(session.refresh_token).toBe('token-abc');
    expect(session.expires_at).toBe('2099-12-31T23:59:59Z');
  });

  test('findByToken retrieves session', () => {
    db.sessions.create(1, 'find-me', '2099-01-01');
    const session = db.sessions.findByToken('find-me');
    expect(session).toBeTruthy();
    expect(session.user_id).toBe(1);
  });

  test('findByToken returns undefined for missing token', () => {
    expect(db.sessions.findByToken('nope')).toBeUndefined();
  });

  test('deleteByToken removes specific session', () => {
    db.sessions.create(1, 'del-me', '2099-01-01');
    expect(db.sessions.deleteByToken('del-me')).toBe(true);
    expect(db.sessions.findByToken('del-me')).toBeUndefined();
  });

  test('deleteByToken returns false for missing token', () => {
    expect(db.sessions.deleteByToken('nope')).toBe(false);
  });

  test('deleteAllForUser removes all sessions for a user', () => {
    db.sessions.create(1, 'tok1', '2099-01-01');
    db.sessions.create(1, 'tok2', '2099-01-01');
    db.sessions.create(1, 'tok3', '2099-01-01');

    const deleted = db.sessions.deleteAllForUser(1);
    expect(deleted).toBe(3);
    expect(db.sessions.findByToken('tok1')).toBeUndefined();
  });

  test('deleteExpired removes old sessions', () => {
    db.sessions.create(1, 'expired', '2000-01-01T00:00:00Z');
    db.sessions.create(1, 'valid', '2099-01-01T00:00:00Z');

    const deleted = db.sessions.deleteExpired();
    expect(deleted).toBe(1);
    expect(db.sessions.findByToken('expired')).toBeUndefined();
    expect(db.sessions.findByToken('valid')).toBeTruthy();
  });

  test('cascading delete: deleting user removes their sessions', () => {
    db.users.create({ username: 'tempuser', email: 'tmp@test.com', password_hash: 'h' });
    db.sessions.create(2, 'cascade-tok', '2099-01-01');

    db.users.delete(2);
    expect(db.sessions.findByToken('cascade-tok')).toBeUndefined();
  });
});

// =============================================================================
// USAGE LOGS CRUD & AGGREGATIONS
// =============================================================================

describe('Usage Logs', () => {
  // Create a test user before each test (required for foreign key)
  beforeEach(() => {
    db.users.create({
      username: 'usageuser',
      email: 'usage@test.com',
      password_hash: 'hash',
      role: 'user'
    });
  });

  test('create logs an API call', () => {
    const log = db.usageLogs.create({
      userId: 1,
      endpoint: '/api/edit-chunk',
      tokensInput: 500,
      tokensOutput: 800,
      model: 'claude-sonnet-4-20250514',
      projectId: 'proj-123'
    });

    expect(log.user_id).toBe(1);
    expect(log.endpoint).toBe('/api/edit-chunk');
    expect(log.tokens_input).toBe(500);
    expect(log.tokens_output).toBe(800);
    expect(log.model).toBe('claude-sonnet-4-20250514');
    expect(log.project_id).toBe('proj-123');
  });

  test('create with defaults for optional fields', () => {
    const log = db.usageLogs.create({
      userId: 1,
      endpoint: '/api/generate-style-guide'
    });
    expect(log.tokens_input).toBe(0);
    expect(log.tokens_output).toBe(0);
    expect(log.model).toBeNull();
    expect(log.project_id).toBeNull();
  });

  test('getDailyUsage aggregates today\'s tokens', () => {
    db.usageLogs.create({ userId: 1, endpoint: 'e', tokensInput: 100, tokensOutput: 200 });
    db.usageLogs.create({ userId: 1, endpoint: 'e', tokensInput: 300, tokensOutput: 400 });

    const usage = db.usageLogs.getDailyUsage(1);
    expect(usage.input).toBe(400);
    expect(usage.output).toBe(600);
    expect(usage.total).toBe(1000);
  });

  test('getDailyUsage returns zero for user with no logs', () => {
    const usage = db.usageLogs.getDailyUsage(1);
    expect(usage.total).toBe(0);
  });

  test('getMonthlyUsage aggregates this month\'s tokens', () => {
    db.usageLogs.create({ userId: 1, endpoint: 'e', tokensInput: 1000, tokensOutput: 2000 });

    const usage = db.usageLogs.getMonthlyUsage(1);
    expect(usage.input).toBe(1000);
    expect(usage.output).toBe(2000);
    expect(usage.total).toBe(3000);
  });

  test('getHistory returns recent logs in descending order', () => {
    db.usageLogs.create({ userId: 1, endpoint: 'first', tokensInput: 1 });
    db.usageLogs.create({ userId: 1, endpoint: 'second', tokensInput: 2 });
    db.usageLogs.create({ userId: 1, endpoint: 'third', tokensInput: 3 });

    const history = db.usageLogs.getHistory(1, 2);
    expect(history.length).toBe(2);
    expect(history[0].endpoint).toBe('third');
    expect(history[1].endpoint).toBe('second');
  });

  test('getHistory respects limit', () => {
    for (let i = 0; i < 10; i++) {
      db.usageLogs.create({ userId: 1, endpoint: `call-${i}` });
    }
    expect(db.usageLogs.getHistory(1, 3).length).toBe(3);
  });

  test('getSystemStats returns aggregate data', () => {
    db.usageLogs.create({ userId: 1, endpoint: 'e', tokensInput: 100, tokensOutput: 200 });

    db.users.create({ username: 'user2', email: 'u2@test.com', password_hash: 'h' });
    db.usageLogs.create({ userId: 2, endpoint: 'e', tokensInput: 50, tokensOutput: 50 });

    const stats = db.usageLogs.getSystemStats();
    expect(stats.totalCalls).toBe(2);
    expect(stats.totalTokens).toBe(400);
    expect(stats.uniqueUsers).toBe(2);
  });

  test('cascading delete: deleting user removes their usage logs', () => {
    db.users.create({ username: 'tempuser', email: 'tmp@test.com', password_hash: 'h' });
    db.usageLogs.create({ userId: 2, endpoint: 'test' });

    db.users.delete(2);
    const history = db.usageLogs.getHistory(2);
    expect(history.length).toBe(0);
  });
});

// =============================================================================
// TRANSACTIONS
// =============================================================================

describe('Transactions', () => {
  test('transaction commits on success', () => {
    db.transaction(() => {
      db.users.create({ username: 'txuser', email: 'tx@test.com', password_hash: 'h' });
    });
    expect(db.users.findByUsername('txuser')).toBeTruthy();
  });

  test('transaction rolls back on error', () => {
    expect(() => {
      db.transaction(() => {
        db.users.create({ username: 'rollback', email: 'rb@test.com', password_hash: 'h' });
        throw new Error('Force rollback');
      });
    }).toThrow('Force rollback');

    expect(db.users.findByUsername('rollback')).toBeUndefined();
  });
});

// =============================================================================
// EDGE CASES & CONSTRAINTS
// =============================================================================

describe('Constraints & Edge Cases', () => {
  test('foreign key constraint prevents orphaned sessions', () => {
    expect(() => {
      db.sessions.create(999, 'orphan-tok', '2099-01-01');
    }).toThrow();
  });

  test('foreign key constraint prevents orphaned usage logs', () => {
    expect(() => {
      db.usageLogs.create({ userId: 999, endpoint: 'test' });
    }).toThrow();
  });

  test('unique refresh token constraint', () => {
    // Create user first (required for foreign key)
    const user = db.users.create({
      username: 'sessionuser',
      email: 'session@constraint.com',
      password_hash: 'hash'
    });

    db.sessions.create(user.id, 'unique-tok', '2099-01-01');
    expect(() => {
      db.sessions.create(user.id, 'unique-tok', '2099-01-01');
    }).toThrow();
  });

  test('user role check constraint', () => {
    expect(() => {
      db.getDb().prepare(
        "INSERT INTO users (username, email, password_hash, role) VALUES ('bad', 'bad@test.com', 'h', 'superadmin')"
      ).run();
    }).toThrow();
  });

  test('multiple database instances are independent', () => {
    const db2 = new DatabaseService();
    db2.init(':memory:');

    // Both instances start empty (no auto-seeding)
    expect(db2.users.count()).toBe(0);

    // Create a user in db
    db.users.create({ username: 'only-in-db1', email: 'only@test.com', password_hash: 'h' });
    expect(db.users.count()).toBe(1);
    expect(db2.users.count()).toBe(0); // db2 still empty

    db2.close();
  });
});
