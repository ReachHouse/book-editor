/**
 * Integration Tests for Admin API Routes
 *
 * Tests the /api/admin/* HTTP endpoints for user and invite code management.
 * Uses an in-memory SQLite database with test auth tokens.
 */

const request = require('supertest');
const express = require('express');

// Set a test JWT secret before requiring any auth modules
process.env.JWT_SECRET = 'test-admin-integration-secret';

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

// Create regular test users
const regularUser = testDb.users.create({
  username: 'admintest',
  email: 'admintest@example.com',
  password_hash: 'hash123'
});
const regularToken = generateAccessToken(regularUser);

const regularUser2 = testDb.users.create({
  username: 'admintest2',
  email: 'admintest2@example.com',
  password_hash: 'hash456'
});

// Create a minimal test app with the admin routes
const app = express();
app.use(express.json({ limit: '50mb' }));

const adminRoutes = require('../../routes/admin');
app.use(adminRoutes);

// Helpers
function adminGet(path) {
  return request(app).get(path).set('Authorization', `Bearer ${adminToken}`);
}
function adminPut(path) {
  return request(app).put(path).set('Authorization', `Bearer ${adminToken}`);
}
function adminDelete(path) {
  return request(app).delete(path).set('Authorization', `Bearer ${adminToken}`);
}
function adminPost(path) {
  return request(app).post(path).set('Authorization', `Bearer ${adminToken}`);
}
function userGet(path) {
  return request(app).get(path).set('Authorization', `Bearer ${regularToken}`);
}
function userPut(path) {
  return request(app).put(path).set('Authorization', `Bearer ${regularToken}`);
}
function userDelete(path) {
  return request(app).delete(path).set('Authorization', `Bearer ${regularToken}`);
}
function userPost(path) {
  return request(app).post(path).set('Authorization', `Bearer ${regularToken}`);
}

afterAll(() => {
  testDb.close();
});

// =============================================================================
// GET /api/admin/users
// =============================================================================

describe('GET /api/admin/users', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin user', async () => {
    const res = await userGet('/api/admin/users');
    expect(res.status).toBe(403);
  });

  test('returns list of users for admin', async () => {
    const res = await adminGet('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(Array.isArray(res.body.users)).toBe(true);

    // Should include admin, regularUser, and regularUser2
    const usernames = res.body.users.map(u => u.username);
    expect(usernames).toContain('admin');
    expect(usernames).toContain('admintest');
    expect(usernames).toContain('admintest2');
  });

  test('includes user details with sanitized data', async () => {
    const res = await adminGet('/api/admin/users');
    const user = res.body.users.find(u => u.username === 'admintest');

    expect(user.id).toBeDefined();
    expect(user.username).toBe('admintest');
    expect(user.email).toBe('admintest@example.com');
    expect(user.role).toBe('editor');
    expect(user.isActive).toBe(true);
    expect(user.dailyTokenLimit).toBeDefined();
    expect(user.monthlyTokenLimit).toBeDefined();
    expect(user.createdAt).toBeDefined();

    // Should NOT include password hash
    expect(user.password_hash).toBeUndefined();
    expect(user.passwordHash).toBeUndefined();
  });

  test('includes usage data for each user', async () => {
    // Add some usage for regularUser
    testDb.usageLogs.create({
      userId: regularUser.id,
      endpoint: '/api/edit-chunk',
      tokensInput: 1000,
      tokensOutput: 500
    });

    const res = await adminGet('/api/admin/users');
    const user = res.body.users.find(u => u.username === 'admintest');

    expect(user.daily).toBeDefined();
    expect(user.daily.total).toBe(1500);
    expect(user.monthly).toBeDefined();
    expect(user.monthly.total).toBe(1500);

    // Clean up
    testDb.getDb().prepare('DELETE FROM usage_logs').run();
  });

  test('includes project count for each user', async () => {
    const res = await adminGet('/api/admin/users');
    const user = res.body.users.find(u => u.username === 'admintest');
    expect(typeof user.projectCount).toBe('number');
  });
});

// =============================================================================
// PUT /api/admin/users/:id
// =============================================================================

describe('PUT /api/admin/users/:id', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).put(`/api/admin/users/${regularUser.id}`);
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin user', async () => {
    const res = await userPut(`/api/admin/users/${regularUser.id}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  test('returns 400 for invalid user ID', async () => {
    const res = await adminPut('/api/admin/users/invalid')
      .send({ role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid user ID');
  });

  test('returns 404 for non-existent user', async () => {
    const res = await adminPut('/api/admin/users/99999')
      .send({ role: 'admin' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('User not found');
  });

  test('returns 400 when no fields to update', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No fields to update');
  });

  test('updates user role to admin', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');

    // Restore to editor
    await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ role: 'editor' });
  });

  test('updates user role to editor', async () => {
    // First make them admin
    await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ role: 'admin' });

    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ role: 'editor' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('editor');
  });

  test('returns 400 for invalid role', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ role: 'superadmin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Role must be');
  });

  test('updates isActive status', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);

    // Restore
    await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ isActive: true });
  });

  test('updates daily token limit', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ dailyTokenLimit: 999999 });
    expect(res.status).toBe(200);
    expect(res.body.user.dailyTokenLimit).toBe(999999);

    // Restore
    await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ dailyTokenLimit: 500000 });
  });

  test('updates monthly token limit', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ monthlyTokenLimit: 5000000 });
    expect(res.status).toBe(200);
    expect(res.body.user.monthlyTokenLimit).toBe(5000000);

    // Restore
    await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ monthlyTokenLimit: 10000000 });
  });

  test('returns 400 for negative token limit (other than -1)', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ dailyTokenLimit: -100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('-1 (unlimited)');
  });

  test('returns 400 for token limit exceeding maximum', async () => {
    // Maximum is 100 million tokens
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ dailyTokenLimit: 100000001 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cannot exceed');
  });

  test('returns 400 for monthly token limit exceeding maximum', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ monthlyTokenLimit: 200000000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cannot exceed');
  });

  test('prevents admin from changing own role', async () => {
    const res = await adminPut(`/api/admin/users/${adminUser.id}`)
      .send({ role: 'editor' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot change your own role');
  });

  test('prevents admin from deactivating self', async () => {
    const res = await adminPut(`/api/admin/users/${adminUser.id}`)
      .send({ isActive: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot deactivate your own account');
  });

  test('allows admin to update own token limits', async () => {
    const res = await adminPut(`/api/admin/users/${adminUser.id}`)
      .send({ dailyTokenLimit: 1000000 });
    expect(res.status).toBe(200);
    expect(res.body.user.dailyTokenLimit).toBe(1000000);

    // Restore
    await adminPut(`/api/admin/users/${adminUser.id}`)
      .send({ dailyTokenLimit: 500000 });
  });

  test('prevents admin from setting own daily limit to restricted (0)', async () => {
    const res = await adminPut(`/api/admin/users/${adminUser.id}`)
      .send({ dailyTokenLimit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot set your own daily limit to restricted');
  });

  test('prevents admin from setting own monthly limit to restricted (0)', async () => {
    const res = await adminPut(`/api/admin/users/${adminUser.id}`)
      .send({ monthlyTokenLimit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot set your own monthly limit to restricted');
  });

  test('allows admin to set unlimited (-1) for own limits', async () => {
    const res = await adminPut(`/api/admin/users/${adminUser.id}`)
      .send({ dailyTokenLimit: -1, monthlyTokenLimit: -1 });
    expect(res.status).toBe(200);
    expect(res.body.user.dailyTokenLimit).toBe(-1);
    expect(res.body.user.monthlyTokenLimit).toBe(-1);
  });

  test('allows admin to set restricted (0) for other users', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ dailyTokenLimit: 0, monthlyTokenLimit: 0 });
    expect(res.status).toBe(200);
    expect(res.body.user.dailyTokenLimit).toBe(0);
    expect(res.body.user.monthlyTokenLimit).toBe(0);

    // Restore
    await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ dailyTokenLimit: 500000, monthlyTokenLimit: 10000000 });
  });

  test('updates multiple fields at once', async () => {
    const res = await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({
        dailyTokenLimit: 750000,
        monthlyTokenLimit: 15000000,
        isActive: true
      });
    expect(res.status).toBe(200);
    expect(res.body.user.dailyTokenLimit).toBe(750000);
    expect(res.body.user.monthlyTokenLimit).toBe(15000000);
    expect(res.body.user.isActive).toBe(true);

    // Restore
    await adminPut(`/api/admin/users/${regularUser.id}`)
      .send({ dailyTokenLimit: 500000, monthlyTokenLimit: 10000000 });
  });
});

// =============================================================================
// DELETE /api/admin/users/:id
// =============================================================================

describe('DELETE /api/admin/users/:id', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).delete(`/api/admin/users/${regularUser2.id}`);
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin user', async () => {
    const res = await userDelete(`/api/admin/users/${regularUser2.id}`);
    expect(res.status).toBe(403);
  });

  test('returns 400 for invalid user ID', async () => {
    const res = await adminDelete('/api/admin/users/invalid');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid user ID');
  });

  test('returns 404 for non-existent user', async () => {
    const res = await adminDelete('/api/admin/users/99999');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('User not found');
  });

  test('prevents admin from deleting self', async () => {
    const res = await adminDelete(`/api/admin/users/${adminUser.id}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot delete your own account');
  });

  test('deletes user successfully', async () => {
    // Create a user to delete
    const toDelete = testDb.users.create({
      username: 'deleteme',
      email: 'deleteme@example.com',
      password_hash: 'hash789'
    });

    const res = await adminDelete(`/api/admin/users/${toDelete.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify user is gone
    const deleted = testDb.users.findById(toDelete.id);
    expect(deleted).toBeFalsy();
  });
});

// =============================================================================
// GET /api/admin/invite-codes
// =============================================================================

describe('GET /api/admin/invite-codes', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/admin/invite-codes');
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin user', async () => {
    const res = await userGet('/api/admin/invite-codes');
    expect(res.status).toBe(403);
  });

  test('returns list of invite codes for admin', async () => {
    const res = await adminGet('/api/admin/invite-codes');
    expect(res.status).toBe(200);
    expect(res.body.codes).toBeDefined();
    expect(Array.isArray(res.body.codes)).toBe(true);
  });

  test('includes code details', async () => {
    // Create a code first
    const created = testDb.inviteCodes.create('TESTCODE123', adminUser.id);

    const res = await adminGet('/api/admin/invite-codes');
    const code = res.body.codes.find(c => c.code === 'TESTCODE123');

    expect(code).toBeDefined();
    expect(code.id).toBeDefined();
    expect(code.isUsed).toBe(false);
    expect(code.createdBy).toBe('admin');
    expect(code.usedBy).toBeNull();
    expect(code.createdAt).toBeDefined();

    // Clean up
    testDb.getDb().prepare('DELETE FROM invite_codes WHERE code = ?').run('TESTCODE123');
  });
});

// =============================================================================
// POST /api/admin/invite-codes
// =============================================================================

describe('POST /api/admin/invite-codes', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).post('/api/admin/invite-codes');
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin user', async () => {
    const res = await userPost('/api/admin/invite-codes');
    expect(res.status).toBe(403);
  });

  test('creates a new invite code', async () => {
    const res = await adminPost('/api/admin/invite-codes');
    expect(res.status).toBe(200);
    expect(res.body.code).toBeDefined();
    expect(res.body.code.code).toBeDefined();
    expect(res.body.code.code).toHaveLength(16); // 8 bytes = 16 hex chars
    expect(res.body.code.isUsed).toBe(false);
    expect(res.body.code.createdBy).toBe('admin');

    // Clean up
    testDb.getDb().prepare('DELETE FROM invite_codes WHERE id = ?').run(res.body.code.id);
  });

  test('creates unique codes on each call', async () => {
    const res1 = await adminPost('/api/admin/invite-codes');
    const res2 = await adminPost('/api/admin/invite-codes');

    expect(res1.body.code.code).not.toBe(res2.body.code.code);

    // Clean up
    testDb.getDb().prepare('DELETE FROM invite_codes WHERE id = ?').run(res1.body.code.id);
    testDb.getDb().prepare('DELETE FROM invite_codes WHERE id = ?').run(res2.body.code.id);
  });
});
