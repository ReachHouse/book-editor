/**
 * Integration Tests for First-Time Setup API Routes
 *
 * Tests the /api/setup/* HTTP endpoints for initial admin account creation.
 * Uses an in-memory SQLite database.
 *
 * KEY SECURITY TESTS:
 * - Setup endpoints only work when no users exist
 * - Once a user exists, setup returns 403
 * - Password validation is enforced
 * - Username/email validation is enforced
 */

const request = require('supertest');
const express = require('express');

// Create fresh database for setup tests
let testDb;
let app;

describe('Setup API Routes', () => {
  beforeEach(() => {
    // Reset module cache for fresh imports each test
    jest.resetModules();

    // Set test JWT secret
    process.env.JWT_SECRET = 'test-setup-integration-secret';

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
  });

  describe('GET /api/setup/status', () => {
    test('returns needsSetup: true when no users exist', async () => {
      const res = await request(app).get('/api/setup/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ needsSetup: true });
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
      expect(res.body).toEqual({ needsSetup: false });
    });
  });

  describe('POST /api/setup/complete', () => {
    test('creates admin user when no users exist', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
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
          username: 'validuser',
          email: 'valid@test.com'
        });
      expect(res1.status).toBe(400);

      // Missing username
      const res2 = await request(app)
        .post('/api/setup/complete')
        .send({
          email: 'valid@test.com',
          password: 'SecurePass123'
        });
      expect(res2.status).toBe(400);

      // Missing email
      const res3 = await request(app)
        .post('/api/setup/complete')
        .send({
          username: 'validuser',
          password: 'SecurePass123'
        });
      expect(res3.status).toBe(400);
    });

    test('hashes password with bcrypt', async () => {
      const res = await request(app)
        .post('/api/setup/complete')
        .send({
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
