/**
 * Integration Tests for First-Time Setup API Routes
 *
 * Tests the /api/setup/* HTTP endpoints for initial admin account creation.
 * Uses an in-memory SQLite database.
 *
 * KEY SECURITY TESTS:
 * - Setup endpoints only work when no users exist
 * - Once a user exists, setup returns 403
 * - SETUP_SECRET is required to complete setup (prevents unauthorized admin creation)
 * - Password validation is enforced
 * - Username/email validation is enforced
 */

const request = require('supertest');
const express = require('express');

// Test setup secret - used for valid setup requests
const TEST_SETUP_SECRET = 'test-setup-secret-12345';

// Create fresh database for setup tests
let testDb;
let app;

describe('Setup API Routes', () => {
  beforeEach(() => {
    // Reset module cache for fresh imports each test
    jest.resetModules();

    // Set test secrets
    process.env.JWT_SECRET = 'test-setup-integration-secret';
    process.env.SETUP_SECRET = TEST_SETUP_SECRET;

    // Re-require modules after cache reset
    const { DatabaseService } = require('../../services/database');

    testDb = new DatabaseService();
    testDb.init(':memory:');

    // Override the singleton so routes use our test database
    const dbModule = require('../../services/database');
    dbModule.database.db = testDb.db;
    dbModule.database.initialized = true;

    // Create a minimal test app with setup routes
    app = express();
    app.use(express.json({ limit: '50mb' }));

    const setupRoutes = require('../../routes/setup');
    app.use(setupRoutes);
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
    delete process.env.JWT_SECRET;
    delete process.env.SETUP_SECRET;
  });

  describe('GET /api/setup/status', () => {
    test('returns needsSetup: true and setupEnabled: true when no users exist and SETUP_SECRET is set', async () => {
      const res = await request(app).get('/api/setup/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ needsSetup: true, setupEnabled: true });
    });

    test('returns needsSetup: false when users exist', async () => {
      // Create a user first
      testDb.users.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password_hash: 'somehash',
        role: 'admin'
      });

      const res = await request(app).get('/api/setup/status');

      expect(res.status).toBe(200);
      expect(res.body.needsSetup).toBe(false);
    });

    test('returns setupEnabled: false when SETUP_SECRET is not set', async () => {
      // Reset modules and recreate app without SETUP_SECRET
      jest.resetModules();
      delete process.env.SETUP_SECRET;
      process.env.JWT_SECRET = 'test-jwt';

      const { DatabaseService } = require('../../services/database');
      const testDbLocal = new DatabaseService();
      testDbLocal.init(':memory:');

      const dbModule = require('../../services/database');
      dbModule.database.db = testDbLocal.db;
      dbModule.database.initialized = true;

      const localApp = express();
      localApp.use(express.json({ limit: '50mb' }));
      const setupRoutes = require('../../routes/setup');
      localApp.use(setupRoutes);

      const res = await request(localApp).get('/api/setup/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ needsSetup: true, setupEnabled: false });

      testDbLocal.close();
    });
  });

  describe('POST /api/setup/complete', () => {
    test('creates admin user when valid setup_secret is provided', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'myadmin',
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Admin account created');

      // Verify user was created
      const user = testDb.users.findByUsername('myadmin');
      expect(user).not.toBeNull();
      expect(user.role).toBe('admin');
      expect(user.email).toBe('admin@test.com');
    });

    test('returns 403 when setup_secret is missing', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          username: 'myadmin',
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Setup secret is required');
    });

    test('returns 403 when setup_secret is invalid', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: 'wrong-secret',
          username: 'myadmin',
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Invalid setup secret');
    });

    test('returns 403 when SETUP_SECRET env var is not configured', async () => {
      // Reset modules and recreate app without SETUP_SECRET
      jest.resetModules();
      delete process.env.SETUP_SECRET;
      process.env.JWT_SECRET = 'test-jwt';

      const { DatabaseService } = require('../../services/database');
      const testDbLocal = new DatabaseService();
      testDbLocal.init(':memory:');

      const dbModule = require('../../services/database');
      dbModule.database.db = testDbLocal.db;
      dbModule.database.initialized = true;

      const localApp = express();
      localApp.use(express.json({ limit: '50mb' }));
      const setupRoutes = require('../../routes/setup');
      localApp.use(setupRoutes);

      const res = await request(localApp)
        .post('/api/setup/complete')
        .send({
          setup_secret: 'any-secret',
          username: 'myadmin',
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('SETUP_SECRET');

      testDbLocal.close();
    });

    test('returns 403 when users already exist', async () => {
      // Create a user first
      testDb.users.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password_hash: 'somehash',
        role: 'admin'
      });

      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'newadmin',
          email: 'new@example.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Setup already completed');
    });

    test('validates username - too short', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'ab', // too short
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('3-30 characters');
    });

    test('validates username - invalid characters', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'bad user!', // invalid chars
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('letters, numbers');
    });

    test('validates email format', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'validuser',
          email: 'notanemail',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });

    test('validates password - too short', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'validuser',
          email: 'valid@test.com',
          password: 'Short1'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 characters');
    });

    test('validates password - no uppercase', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'validuser',
          email: 'valid@test.com',
          password: 'lowercase123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('uppercase');
    });

    test('validates password - no lowercase', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'validuser',
          email: 'valid@test.com',
          password: 'UPPERCASE123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('lowercase');
    });

    test('validates password - no number', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'validuser',
          email: 'valid@test.com',
          password: 'NoNumbersHere'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('number');
    });

    test('requires all fields', async () => {
      // Missing password
      const res1 = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'validuser',
          email: 'valid@test.com'
        });
      expect(res1.status).toBe(400);

      // Missing username
      const res2 = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          email: 'valid@test.com',
          password: 'SecurePass123'
        });
      expect(res2.status).toBe(400);

      // Missing email
      const res3 = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'validuser',
          password: 'SecurePass123'
        });
      expect(res3.status).toBe(400);
    });

    test('hashes password with bcrypt', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'myadmin',
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(200);

      // Verify password is hashed (bcrypt hashes start with $2b$)
      const user = testDb.users.findByUsername('myadmin');
      expect(user.password_hash).toMatch(/^\$2[ab]\$/);
    });

    test('trims and lowercases email', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: 'myadmin',
          email: '  Admin@TEST.com  ',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(200);

      const user = testDb.users.findByUsername('myadmin');
      expect(user.email).toBe('admin@test.com');
    });

    test('trims username', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
          setup_secret: TEST_SETUP_SECRET,
          username: '  myadmin  ',
          email: 'admin@test.com',
          password: 'SecurePass123'
        });

      expect(res.status).toBe(200);

      const user = testDb.users.findByUsername('myadmin');
      expect(user).not.toBeNull();
    });
  });
});
