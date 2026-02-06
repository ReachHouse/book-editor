/**
 * =============================================================================
 * AUTH MIDDLEWARE TESTS
 * =============================================================================
 *
 * Tests for the JWT authentication middleware including:
 * - requireAuth: Token verification and user attachment
 * - requireAdmin: Admin role checking
 * - optionalAuth: Optional token handling
 * - extractToken: Header parsing
 *
 * Uses an in-memory database and mock Express req/res objects.
 *
 * =============================================================================
 */

const { DatabaseService } = require('../../services/database');

let db;
let requireAuth, requireAdmin, optionalAuth, extractToken;
let generateAccessToken;

beforeEach(() => {
  jest.resetModules();

  process.env.JWT_SECRET = 'test-secret-key-for-middleware-tests';

  db = new DatabaseService();
  db.init(':memory:');

  // Override the singleton
  const dbModule = require('../../services/database');
  dbModule.database.db = db.db;
  dbModule.database.initialized = true;

  // Create test admin user (previously done by _seedDefaults, now manual)
  db.users.create({
    username: 'admin',
    email: 'admin@test.com',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.BNitPrG6R3rZMK',
    role: 'admin'
  });

  const middleware = require('../../middleware/auth');
  requireAuth = middleware.requireAuth;
  requireAdmin = middleware.requireAdmin;
  optionalAuth = middleware.optionalAuth;
  extractToken = middleware.extractToken;

  const authModule = require('../../services/authService');
  generateAccessToken = authModule.generateAccessToken;
});

afterEach(() => {
  db.close();
  delete process.env.JWT_SECRET;
});

/**
 * Create a mock Express request object.
 */
function mockReq(headers = {}) {
  return { headers };
}

/**
 * Create a mock Express response object.
 */
function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      res.headersSent = true;
      return res;
    }
  };
  return res;
}

// =============================================================================
// extractToken
// =============================================================================

describe('extractToken', () => {
  test('extracts token from Bearer header', () => {
    const req = mockReq({ authorization: 'Bearer abc123' });
    expect(extractToken(req)).toBe('abc123');
  });

  test('returns null when no Authorization header', () => {
    const req = mockReq({});
    expect(extractToken(req)).toBeNull();
  });

  test('returns null when Authorization is not Bearer', () => {
    const req = mockReq({ authorization: 'Basic abc123' });
    expect(extractToken(req)).toBeNull();
  });

  test('returns null when Authorization is empty', () => {
    const req = mockReq({ authorization: '' });
    expect(extractToken(req)).toBeNull();
  });
});

// =============================================================================
// requireAuth
// =============================================================================

describe('requireAuth', () => {
  test('attaches user to req with valid token', (done) => {
    const admin = db.users.findByUsername('admin');
    const token = generateAccessToken(admin);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAuth(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(admin.id);
      expect(req.user.username).toBe('admin');
      expect(req.user.role).toBe('admin');
      done();
    });
  });

  test('returns 401 when no token provided', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for invalid token', () => {
    const req = mockReq({ authorization: 'Bearer invalid-token' });
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid token');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for deactivated user', () => {
    const admin = db.users.findByUsername('admin');
    db.users.update(admin.id, { is_active: 0 });

    const token = generateAccessToken(admin);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/not found or deactivated/);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 with TOKEN_EXPIRED code for expired token', () => {
    // Create a token that's already expired
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: 1, username: 'admin', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }  // Immediately expired
    );

    // Small delay to ensure token is expired
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    expect(next).not.toHaveBeenCalled();
  });
});

// =============================================================================
// requireAdmin
// =============================================================================

describe('requireAdmin', () => {
  test('allows admin users through', (done) => {
    const admin = db.users.findByUsername('admin');
    const token = generateAccessToken(admin);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, () => {
      expect(req.user.role).toBe('admin');
      done();
    });
  });

  test('returns 403 for non-admin users', async () => {
    // Create a regular user
    const { hashPassword } = require('../../services/authService');
    const hash = await hashPassword('password123');
    const user = db.users.create({
      username: 'regular',
      email: 'regular@example.com',
      password_hash: hash,
      role: 'editor'
    });

    const token = generateAccessToken(user);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Admin access required');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when no token provided', () => {
    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// =============================================================================
// optionalAuth
// =============================================================================

describe('optionalAuth', () => {
  test('attaches user when valid token provided', (done) => {
    const admin = db.users.findByUsername('admin');
    const token = generateAccessToken(admin);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    optionalAuth(req, res, () => {
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(admin.id);
      done();
    });
  });

  test('sets user to null when no token provided', (done) => {
    const req = mockReq({});
    const res = mockRes();

    optionalAuth(req, res, () => {
      expect(req.user).toBeNull();
      done();
    });
  });

  test('sets user to null when token is invalid', (done) => {
    const req = mockReq({ authorization: 'Bearer bad-token' });
    const res = mockRes();

    optionalAuth(req, res, () => {
      expect(req.user).toBeNull();
      done();
    });
  });

  test('sets user to null when user is deactivated', (done) => {
    const admin = db.users.findByUsername('admin');
    db.users.update(admin.id, { is_active: 0 });

    const token = generateAccessToken(admin);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    optionalAuth(req, res, () => {
      expect(req.user).toBeNull();
      done();
    });
  });
});
