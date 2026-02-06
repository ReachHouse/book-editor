/**
 * Integration Tests for API Routes
 *
 * Tests the HTTP endpoints using supertest.
 * Focuses on input validation and document generation
 * (skips tests that require actual API key/Claude calls).
 *
 * Since v1.26.0, API endpoints require JWT authentication.
 * The test setup creates a test database, registers a user, and
 * generates an auth token for all requests.
 */

const request = require('supertest');
const express = require('express');

// Set a test JWT secret before requiring any auth modules
process.env.JWT_SECRET = 'test-api-integration-secret';

const { DatabaseService } = require('../../services/database');

// Set up in-memory database before importing routes (they use database singleton)
const testDb = new DatabaseService();
testDb.init(':memory:');

// Override the singleton
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

// Now import auth modules (they depend on the database)
const { generateAccessToken } = require('../../services/authService');

// Generate a valid auth token for the admin user
const authToken = generateAccessToken(adminUser);

// Create a minimal test app with just the routes we need
const app = express();
app.use(express.json({ limit: '50mb' }));

// Import routes
const apiRoutes = require('../../routes/api');
const healthRoutes = require('../../routes/health');

app.use(apiRoutes);
app.use(healthRoutes);

// Helper: make an authenticated POST request
function authPost(path) {
  return request(app)
    .post(path)
    .set('Authorization', `Bearer ${authToken}`);
}

afterAll(() => {
  testDb.close();
});

// =============================================================================
// Health Check Tests
// =============================================================================

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    test('returns 200 status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    test('returns JSON with status field', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('status');
    });

    test('returns message field', async () => {
      const response = await request(app).get('/health');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Book Editor');
    });
  });

  describe('GET /api/status', () => {
    test('returns 200 status', async () => {
      const response = await request(app).get('/api/status');
      expect(response.status).toBe(200);
    });

    test('returns apiKeyConfigured field', async () => {
      const response = await request(app).get('/api/status');
      expect(response.body).toHaveProperty('apiKeyConfigured');
    });
  });
});

// =============================================================================
// Authentication Requirement Tests
// =============================================================================

describe('Authentication requirement', () => {
  test('returns 401 for /api/generate-docx without token', async () => {
    const response = await request(app)
      .post('/api/generate-docx')
      .send({ originalText: 'Hello', editedText: 'World' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  test('returns 401 for /api/edit-chunk without token', async () => {
    const response = await request(app)
      .post('/api/edit-chunk')
      .send({ text: 'Hello' });

    expect(response.status).toBe(401);
  });

  test('returns 401 for /api/generate-style-guide without token', async () => {
    const response = await request(app)
      .post('/api/generate-style-guide')
      .send({ text: 'Hello' });

    expect(response.status).toBe(401);
  });
});

// =============================================================================
// Document Generation Tests (POST /api/generate-docx)
// =============================================================================

describe('POST /api/generate-docx', () => {
  describe('input validation', () => {
    test('returns 400 when originalText is missing', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ editedText: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('originalText');
    });

    test('returns 400 when editedText is missing', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ originalText: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('editedText');
    });

    test('returns 400 when originalText is empty string', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ originalText: '', editedText: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('empty');
    });

    test('returns 400 when editedText is empty string', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ originalText: 'Hello', editedText: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('empty');
    });

    test('returns 400 when originalText is whitespace only', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ originalText: '   ', editedText: 'Hello' });

      expect(response.status).toBe(400);
    });

    test('returns 400 when originalText is not a string', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ originalText: 123, editedText: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('string');
    });

    test('returns 400 when editedText is not a string', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ originalText: 'Hello', editedText: ['array'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('string');
    });

    test('returns 400 when originalText is null', async () => {
      const response = await authPost('/api/generate-docx')
        .send({ originalText: null, editedText: 'Hello' });

      expect(response.status).toBe(400);
    });
  });

  describe('successful document generation', () => {
    test('returns 200 for valid input', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Hello world',
          editedText: 'Hello there'
        });

      expect(response.status).toBe(200);
    });

    test('returns correct Content-Type header', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Hello world',
          editedText: 'Hello there'
        });

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    test('returns Content-Disposition header for download', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Hello world',
          editedText: 'Hello there'
        });

      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('uses provided fileName in Content-Disposition', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Hello world',
          editedText: 'Hello there',
          fileName: 'my_document.docx'
        });

      expect(response.headers['content-disposition']).toContain('my_document.docx');
    });

    test('returns binary data starting with PK (ZIP signature)', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Hello world',
          editedText: 'Hello there'
        })
        .responseType('blob');

      // DOCX files are ZIP archives - check the raw buffer
      const buffer = Buffer.from(response.body);
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4B); // K
    });

    test('handles identical text (no changes)', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Same text',
          editedText: 'Same text'
        });

      expect(response.status).toBe(200);
    });

    test('handles complex multi-paragraph documents', async () => {
      const original = `Chapter One

The morning sun cast long shadows across the garden. Sarah walked slowly.

She had always been careful. But now everything was different.`;

      const edited = `Chapter One

The morning sunlight cast long shadows across the garden. Sarah walked deliberately.

She had always been cautious. But now everything had shifted.`;

      const response = await authPost('/api/generate-docx')
        .send({ originalText: original, editedText: edited });

      expect(response.status).toBe(200);
    });
  });

  describe('filename sanitization (security)', () => {
    test('sanitizes filename with newlines', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Hello',
          editedText: 'World',
          fileName: 'bad\nfile\rname.docx'
        });

      // Should not contain newlines
      expect(response.headers['content-disposition']).not.toContain('\n');
      expect(response.headers['content-disposition']).not.toContain('\r');
    });

    test('uses default filename when fileName is invalid', async () => {
      const response = await authPost('/api/generate-docx')
        .send({
          originalText: 'Hello',
          editedText: 'World',
          fileName: 123 // Not a string
        });

      expect(response.headers['content-disposition']).toContain('edited_document.docx');
    });
  });
});

// =============================================================================
// Edit Chunk Tests (POST /api/edit-chunk)
// =============================================================================

describe('POST /api/edit-chunk', () => {
  describe('input validation', () => {
    test('returns 400 when text is missing', async () => {
      const response = await authPost('/api/edit-chunk')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('text');
    });

    test('returns 400 when text is empty', async () => {
      const response = await authPost('/api/edit-chunk')
        .send({ text: '' });

      expect(response.status).toBe(400);
    });

    test('returns 400 when text is not a string', async () => {
      const response = await authPost('/api/edit-chunk')
        .send({ text: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('string');
    });
  });

  // Note: Actual editing tests require ANTHROPIC_API_KEY
  // and would make real API calls - skipped in unit tests
  describe('API key validation', () => {
    test('returns 503 when API key is not configured', async () => {
      // Save original key
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await authPost('/api/edit-chunk')
        .send({ text: 'Hello world' });

      // Restore key
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }

      // Generic error message to avoid information disclosure
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Service temporarily unavailable');
    });
  });
});

// =============================================================================
// Style Guide Tests (POST /api/generate-style-guide)
// =============================================================================

describe('POST /api/generate-style-guide', () => {
  describe('input validation', () => {
    test('returns 400 when text is missing', async () => {
      const response = await authPost('/api/generate-style-guide')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('text');
    });

    test('returns 400 when text is empty', async () => {
      const response = await authPost('/api/generate-style-guide')
        .send({ text: '' });

      expect(response.status).toBe(400);
    });

    test('returns 400 when text is not a string', async () => {
      const response = await authPost('/api/generate-style-guide')
        .send({ text: { object: true } });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('string');
    });
  });
});
