/**
 * Integration Tests for Project API Routes
 *
 * Tests the /api/projects HTTP endpoints using supertest.
 * Uses an in-memory SQLite database with a test auth token.
 */

const request = require('supertest');
const express = require('express');

// Set a test JWT secret before requiring any auth modules
process.env.JWT_SECRET = 'test-projects-integration-secret';

const { DatabaseService } = require('../../services/database');

// Set up in-memory database before importing routes
const testDb = new DatabaseService();
testDb.init(':memory:');

// Override the singleton so routes use our test database
const dbModule = require('../../services/database');
dbModule.database.db = testDb.db;
dbModule.database.initialized = true;

// Generate a valid auth token for the seeded admin user
const { generateAccessToken } = require('../../services/authService');
const adminUser = testDb.users.findByUsername('admin');
const authToken = generateAccessToken(adminUser);

// Create a minimal test app with just the routes we need
const app = express();
app.use(express.json({ limit: '50mb' }));

const projectRoutes = require('../../routes/projects');
app.use(projectRoutes);

// Helpers
function authGet(path) {
  return request(app)
    .get(path)
    .set('Authorization', `Bearer ${authToken}`);
}
function authPut(path) {
  return request(app)
    .put(path)
    .set('Authorization', `Bearer ${authToken}`);
}
function authDelete(path) {
  return request(app)
    .delete(path)
    .set('Authorization', `Bearer ${authToken}`);
}

afterEach(() => {
  testDb.getDb().prepare('DELETE FROM projects').run();
});

afterAll(() => {
  testDb.close();
});

// =============================================================================
// LIST PROJECTS
// =============================================================================

describe('GET /api/projects', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  test('returns empty projects array initially', async () => {
    const res = await authGet('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
  });

  test('returns project metadata', async () => {
    testDb.projects.save(adminUser.id, {
      id: '1001',
      fileName: 'test.docx',
      isComplete: true,
      chunksCompleted: 5,
      totalChunks: 5,
      chunkSize: 2000
    });

    const res = await authGet('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(1);

    const project = res.body.projects[0];
    expect(project.id).toBe('1001');
    expect(project.fileName).toBe('test.docx');
    expect(project.isComplete).toBe(true);
    expect(project.chunksCompleted).toBe(5);
    expect(project.totalChunks).toBe(5);
    expect(project.chunkSize).toBe(2000);
    expect(project.timestamp).toBeDefined();
  });

  test('does not include text content in list', async () => {
    testDb.projects.save(adminUser.id, {
      id: '1001',
      fileName: 'test.docx',
      originalText: 'Big manuscript text'
    });

    const res = await authGet('/api/projects');
    const project = res.body.projects[0];
    expect(project).not.toHaveProperty('originalText');
    expect(project).not.toHaveProperty('editedChunks');
    expect(project).not.toHaveProperty('fullEditedText');
  });

  test('returns multiple projects sorted by most recent', async () => {
    testDb.projects.save(adminUser.id, { id: '1001', fileName: 'old.docx' });
    testDb.projects.save(adminUser.id, { id: '1002', fileName: 'new.docx' });

    const res = await authGet('/api/projects');
    expect(res.body.projects).toHaveLength(2);
  });
});

// =============================================================================
// GET SINGLE PROJECT
// =============================================================================

describe('GET /api/projects/:id', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/projects/1001');
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent project', async () => {
    const res = await authGet('/api/projects/nonexistent');
    expect(res.status).toBe(404);
  });

  test('returns full project data including text content', async () => {
    testDb.projects.save(adminUser.id, {
      id: '1001',
      fileName: 'test.docx',
      originalText: 'Original text',
      editedChunks: ['Edited chunk 1'],
      fullEditedText: 'Full edited text',
      styleGuide: 'Be consistent',
      isComplete: true,
      chunksCompleted: 1,
      totalChunks: 1,
      chunkSize: 2000,
      docContent: { original: 'orig', edited: 'edit', fileName: 'test_EDITED.docx' }
    });

    const res = await authGet('/api/projects/1001');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('1001');
    expect(res.body.fileName).toBe('test.docx');
    expect(res.body.originalText).toBe('Original text');
    expect(res.body.editedChunks).toEqual(['Edited chunk 1']);
    expect(res.body.fullEditedText).toBe('Full edited text');
    expect(res.body.styleGuide).toBe('Be consistent');
    expect(res.body.isComplete).toBe(true);
    expect(res.body.docContent).toEqual({
      original: 'orig',
      edited: 'edit',
      fileName: 'test_EDITED.docx'
    });
  });

  test('returns empty array for null editedChunks', async () => {
    testDb.projects.save(adminUser.id, {
      id: '1001',
      fileName: 'test.docx'
    });

    const res = await authGet('/api/projects/1001');
    expect(res.body.editedChunks).toEqual([]);
    expect(res.body.docContent).toBeNull();
  });

  test('handles corrupted JSON data gracefully', async () => {
    // Insert corrupted JSON directly into the database
    const db = testDb.getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, user_id, file_name, edited_chunks, doc_content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('corrupt1', adminUser.id, 'test.docx', 'not valid json {', 'also { not valid', now, now);

    const res = await authGet('/api/projects/corrupt1');
    expect(res.status).toBe(200);
    // Should return fallback values instead of crashing
    expect(res.body.editedChunks).toEqual([]);
    expect(res.body.docContent).toBeNull();
  });
});

// =============================================================================
// SAVE/UPDATE PROJECT
// =============================================================================

describe('PUT /api/projects/:id', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/projects/1001')
      .send({ fileName: 'test.docx' });
    expect(res.status).toBe(401);
  });

  test('creates a new project', async () => {
    const res = await authPut('/api/projects/1001')
      .send({
        fileName: 'test.docx',
        chunksCompleted: 0,
        totalChunks: 5,
        chunkSize: 2000,
        originalText: 'My manuscript'
      });

    expect(res.status).toBe(200);
    expect(res.body.project.id).toBe('1001');
    expect(res.body.project.fileName).toBe('test.docx');
  });

  test('updates existing project', async () => {
    await authPut('/api/projects/1001')
      .send({ fileName: 'test.docx', chunksCompleted: 0, totalChunks: 5 });

    const res = await authPut('/api/projects/1001')
      .send({ fileName: 'test.docx', chunksCompleted: 3, totalChunks: 5 });

    expect(res.status).toBe(200);
    expect(res.body.project.chunksCompleted).toBe(3);
  });

  test('rejects missing fileName', async () => {
    const res = await authPut('/api/projects/1001')
      .send({ chunksCompleted: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('fileName');
  });

  test('rejects oversized text', async () => {
    const hugeText = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const res = await authPut('/api/projects/1001')
      .send({ fileName: 'test.docx', originalText: hugeText });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('maximum size');
  });

  test('stores and retrieves editedChunks array', async () => {
    await authPut('/api/projects/1001')
      .send({
        fileName: 'test.docx',
        editedChunks: ['chunk one', 'chunk two', 'chunk three']
      });

    const res = await authGet('/api/projects/1001');
    expect(res.body.editedChunks).toEqual(['chunk one', 'chunk two', 'chunk three']);
  });

  test('stores and retrieves docContent object', async () => {
    const docContent = {
      original: 'original text',
      edited: 'edited text',
      fileName: 'test_EDITED.docx'
    };

    await authPut('/api/projects/1001')
      .send({ fileName: 'test.docx', docContent });

    const res = await authGet('/api/projects/1001');
    expect(res.body.docContent).toEqual(docContent);
  });

  test('handles complete project save', async () => {
    const res = await authPut('/api/projects/1001')
      .send({
        fileName: 'test.docx',
        isComplete: true,
        chunksCompleted: 3,
        totalChunks: 3,
        chunkSize: 2000,
        originalText: 'original',
        editedChunks: ['a', 'b', 'c'],
        fullEditedText: 'a\n\nb\n\nc',
        styleGuide: 'Be consistent'
      });

    expect(res.status).toBe(200);
    expect(res.body.project.isComplete).toBe(true);
  });
});

// =============================================================================
// DELETE PROJECT
// =============================================================================

describe('DELETE /api/projects/:id', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/projects/1001');
    expect(res.status).toBe(401);
  });

  test('deletes an existing project', async () => {
    testDb.projects.save(adminUser.id, {
      id: '1001',
      fileName: 'test.docx'
    });

    const res = await authDelete('/api/projects/1001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await authGet('/api/projects/1001');
    expect(check.status).toBe(404);
  });

  test('returns 404 for non-existent project', async () => {
    const res = await authDelete('/api/projects/nonexistent');
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// PROJECT LIMIT ENFORCEMENT
// =============================================================================

describe('Project limit enforcement', () => {
  test('rejects creation beyond max projects', async () => {
    // Create 50 projects (the limit)
    for (let i = 0; i < 50; i++) {
      testDb.projects.save(adminUser.id, {
        id: `proj-${i}`,
        fileName: `file-${i}.docx`
      });
    }

    // 51st should fail
    const res = await authPut('/api/projects/proj-50')
      .send({ fileName: 'one-too-many.docx' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Maximum');
  });

  test('allows updating existing project at limit', async () => {
    // Create 50 projects
    for (let i = 0; i < 50; i++) {
      testDb.projects.save(adminUser.id, {
        id: `proj-${i}`,
        fileName: `file-${i}.docx`
      });
    }

    // Update an existing one — should succeed
    const res = await authPut('/api/projects/proj-0')
      .send({ fileName: 'updated.docx', chunksCompleted: 5 });
    expect(res.status).toBe(200);
  });
});
