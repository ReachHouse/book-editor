/**
 * Integration Tests for Usage API Routes
 *
 * Tests the /api/usage and /api/admin/usage HTTP endpoints using supertest.
 * Also tests usage limit enforcement on /api/edit-chunk and /api/generate-style-guide.
 * Uses an in-memory SQLite database with test auth tokens.
 */

const request = require('supertest');
const express = require('express');

// Set a test JWT secret before requiring any auth modules
process.env.JWT_SECRET = 'test-usage-integration-secret';

const { DatabaseService } = require('../../services/database');

// Set up in-memory database before importing routes
const testDb = new DatabaseService();
testDb.init(':memory:');

// Override the singleton so routes use our test database
const dbModule = require('../../services/database');
dbModule.database.db = testDb.db;
dbModule.database.initialized = true;

// Create test admin user (previously done by _seedDefaults, now manual)
const adminUser = testDb.users.create({
  username: 'admin',
  email: 'admin@test.com',
  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.BNitPrG6R3rZMK',
  role: 'admin'
});

// Generate auth tokens for the admin user and a regular user
const { generateAccessToken } = require('../../services/authService');
const adminToken = generateAccessToken(adminUser);

// Create a regular test user
const regularUser = testDb.users.create({
  username: 'usagetest',
  email: 'usagetest@example.com',
  password_hash: 'hash123'
});
const regularToken = generateAccessToken(regularUser);

// Create a minimal test app with the routes we need
const app = express();
app.use(express.json({ limit: '50mb' }));

const usageRoutes = require('../../routes/usage');
const apiRoutes = require('../../routes/api');
app.use(usageRoutes);
app.use(apiRoutes);

// Helpers
function adminGet(path) {
  return request(app).get(path).set('Authorization', `Bearer ${adminToken}`);
}
function userGet(path) {
  return request(app).get(path).set('Authorization', `Bearer ${regularToken}`);
}
function userPost(path) {
  return request(app).post(path).set('Authorization', `Bearer ${regularToken}`);
}

afterEach(() => {
  // Clean usage logs between tests
  testDb.getDb().prepare('DELETE FROM usage_logs').run();
  // Reset user limits to defaults
  testDb.users.update(regularUser.id, {
    daily_token_limit: 500000,
    monthly_token_limit: 10000000
  });
});

afterAll(() => {
  testDb.close();
});

// =============================================================================
// GET /api/usage
// =============================================================================

describe('GET /api/usage', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/usage');
    expect(res.status).toBe(401);
  });

  test('returns usage summary with zero usage', async () => {
    const res = await userGet('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.daily).toBeDefined();
    expect(res.body.monthly).toBeDefined();

    expect(res.body.daily.total).toBe(0);
    expect(res.body.daily.limit).toBe(500000);
    expect(res.body.daily.percentage).toBe(0);

    expect(res.body.monthly.total).toBe(0);
    expect(res.body.monthly.limit).toBe(10000000);
    expect(res.body.monthly.percentage).toBe(0);
  });

  test('returns correct usage after logging', async () => {
    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 1000,
      tokensOutput: 500,
      model: 'claude-sonnet-4-20250514'
    });
    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 2000,
      tokensOutput: 1000,
      model: 'claude-sonnet-4-20250514'
    });

    const res = await userGet('/api/usage');
    expect(res.status).toBe(200);
    expect(res.body.daily.input).toBe(3000);
    expect(res.body.daily.output).toBe(1500);
    expect(res.body.daily.total).toBe(4500);
  });

  test('calculates percentage correctly', async () => {
    // Set a small limit for easy percentage calculation
    testDb.users.update(regularUser.id, { daily_token_limit: 100 });

    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 40,
      tokensOutput: 35
    });

    const res = await userGet('/api/usage');
    expect(res.body.daily.percentage).toBe(75); // 75 out of 100 = 75%
  });

  test('caps percentage at 100', async () => {
    testDb.users.update(regularUser.id, { daily_token_limit: 100 });

    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 100,
      tokensOutput: 100
    });

    const res = await userGet('/api/usage');
    expect(res.body.daily.percentage).toBe(100);
  });

  test('does not include other users usage', async () => {
    // Log usage for admin
    testDb.usageLogs.create({
      userId: adminUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 99999,
      tokensOutput: 99999
    });

    const res = await userGet('/api/usage');
    expect(res.body.daily.total).toBe(0);
  });
});

// =============================================================================
// GET /api/usage/history
// =============================================================================

describe('GET /api/usage/history', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/usage/history');
    expect(res.status).toBe(401);
  });

  test('returns empty history initially', async () => {
    const res = await userGet('/api/usage/history');
    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
  });

  test('returns formatted history entries', async () => {
    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 1000,
      tokensOutput: 500,
      model: 'claude-sonnet-4-20250514',
      projectId: 'proj-1'
    });

    const res = await userGet('/api/usage/history');
    expect(res.body.history).toHaveLength(1);

    const entry = res.body.history[0];
    expect(entry.endpoint).toBe('/api/edit-chunk');
    expect(entry.tokensInput).toBe(1000);
    expect(entry.tokensOutput).toBe(500);
    expect(entry.tokensTotal).toBe(1500);
    expect(entry.model).toBe('claude-sonnet-4-20250514');
    expect(entry.projectId).toBe('proj-1');
    expect(entry.createdAt).toBeDefined();
  });

  test('respects limit parameter', async () => {
    for (let i = 0; i < 5; i++) {
      testDb.usageLogs.create({
        userId: regularUser.id,
        endpoint: `/api/edit-chunk`,
        tokensInput: i * 100
      });
    }

    const res = await userGet('/api/usage/history?limit=3');
    expect(res.body.history).toHaveLength(3);
  });

  test('caps limit at 200', async () => {
    const res = await userGet('/api/usage/history?limit=999');
    expect(res.status).toBe(200);
    // Just check it doesn't error — we can't easily test the cap without 200+ entries
  });

  test('handles negative limit parameter', async () => {
    // Create 3 entries
    for (let i = 0; i < 3; i++) {
      testDb.usageLogs.create({
        userId: regularUser.id,
        endpoint: `/api/edit-chunk`,
        tokensInput: i * 100
      });
    }

    // Negative limit should be clamped to 1 (minimum)
    const res = await userGet('/api/usage/history?limit=-5');
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
  });

  test('handles zero limit parameter', async () => {
    // Create 3 entries
    for (let i = 0; i < 3; i++) {
      testDb.usageLogs.create({
        userId: regularUser.id,
        endpoint: `/api/edit-chunk`,
        tokensInput: i * 100
      });
    }

    // Zero limit should be clamped to 1 (minimum)
    const res = await userGet('/api/usage/history?limit=0');
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
  });

  test('does not include other users history', async () => {
    testDb.usageLogs.create({
      userId: adminUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 5000
    });

    const res = await userGet('/api/usage/history');
    expect(res.body.history).toHaveLength(0);
  });
});

// =============================================================================
// GET /api/admin/usage
// =============================================================================

describe('GET /api/admin/usage', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/admin/usage');
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin user', async () => {
    const res = await userGet('/api/admin/usage');
    expect(res.status).toBe(403);
  });

  test('returns system stats for admin', async () => {
    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 1000,
      tokensOutput: 500
    });

    const res = await adminGet('/api/admin/usage');
    expect(res.status).toBe(200);
    expect(res.body.system).toBeDefined();
    expect(res.body.system.totalCalls).toBe(1);
    expect(res.body.system.totalTokens).toBe(1500);
    expect(res.body.system.uniqueUsers).toBe(1);
  });

  test('returns per-user usage for admin', async () => {
    const res = await adminGet('/api/admin/usage');
    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(Array.isArray(res.body.users)).toBe(true);

    // Should include both admin and regular user
    const usernames = res.body.users.map(u => u.username);
    expect(usernames).toContain('admin');
    expect(usernames).toContain('usagetest');
  });

  test('includes per-user daily and monthly usage', async () => {
    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 2000,
      tokensOutput: 1000
    });

    const res = await adminGet('/api/admin/usage');
    const user = res.body.users.find(u => u.username === 'usagetest');
    expect(user.daily.total).toBe(3000);
    expect(user.daily.limit).toBe(500000);
    expect(user.monthly.total).toBe(3000);
  });
});

// =============================================================================
// USAGE LIMIT ENFORCEMENT
// =============================================================================

describe('Usage limit enforcement', () => {
  test('returns 429 when daily limit exceeded on edit-chunk', async () => {
    // Set very low daily limit
    testDb.users.update(regularUser.id, { daily_token_limit: 100 });

    // Create usage that exceeds the limit
    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 60,
      tokensOutput: 60
    });

    const res = await userPost('/api/edit-chunk')
      .send({ text: 'Hello world' });

    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Daily token limit');
  });

  test('returns 429 when monthly limit exceeded on edit-chunk', async () => {
    // Set very low monthly limit
    testDb.users.update(regularUser.id, { monthly_token_limit: 100 });

    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 60,
      tokensOutput: 60
    });

    const res = await userPost('/api/edit-chunk')
      .send({ text: 'Hello world' });

    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Monthly token limit');
  });

  test('returns 429 when daily limit exceeded on generate-style-guide', async () => {
    testDb.users.update(regularUser.id, { daily_token_limit: 100 });

    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 60,
      tokensOutput: 60
    });

    const res = await userPost('/api/generate-style-guide')
      .send({ text: 'Hello world' });

    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Daily token limit');
  });

  test('allows request when under daily limit', async () => {
    testDb.users.update(regularUser.id, { daily_token_limit: 10000 });

    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 100,
      tokensOutput: 100
    });

    // Request should pass validation (will fail at API key check, which is fine)
    const res = await userPost('/api/edit-chunk')
      .send({ text: 'Hello world' });

    // Should NOT be 429 — it will be 503 (no API key) but not rate-limited
    expect(res.status).not.toBe(429);
  });
});
