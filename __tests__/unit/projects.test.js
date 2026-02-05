/**
 * =============================================================================
 * PROJECT STORAGE TESTS
 * =============================================================================
 *
 * Tests for server-side project storage including:
 * - Database: projects table CRUD operations
 * - API routes: project endpoints (list, get, save, delete)
 *
 * Each test suite uses an in-memory database for isolation.
 *
 * =============================================================================
 */

const { DatabaseService } = require('../../services/database');

// =============================================================================
// DATABASE UNIT TESTS
// =============================================================================

describe('Projects Database', () => {
  /** @type {DatabaseService} */
  let db;
  let userId;

  beforeEach(() => {
    db = new DatabaseService();
    db.init(':memory:');
    // Create a test user
    const user = db.users.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash123'
    });
    userId = user.id;
  });

  afterEach(() => {
    db.close();
  });

  describe('projects table exists', () => {
    test('migration creates projects table', () => {
      const table = db.getDb()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
        .get();
      expect(table).toBeTruthy();
    });

    test('migration is recorded in schema_version', () => {
      const versions = db.getDb()
        .prepare('SELECT * FROM schema_version WHERE version = 2')
        .get();
      expect(versions).toBeTruthy();
      expect(versions.name).toContain('002_projects');
    });
  });

  describe('save', () => {
    test('creates a new project', () => {
      const saved = db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        isComplete: false,
        chunksCompleted: 0,
        totalChunks: 5,
        chunkSize: 2000,
        originalText: 'Hello world',
        editedChunks: ['Edited hello'],
        styleGuide: 'Style guide text'
      });

      expect(saved).toBeTruthy();
      expect(saved.id).toBe('1001');
      expect(saved.file_name).toBe('test.docx');
      expect(saved.is_complete).toBe(0);
      expect(saved.chunks_completed).toBe(0);
      expect(saved.total_chunks).toBe(5);
    });

    test('upserts existing project', () => {
      db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        chunksCompleted: 1,
        totalChunks: 5
      });

      const updated = db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        chunksCompleted: 3,
        totalChunks: 5
      });

      expect(updated.chunks_completed).toBe(3);
    });

    test('serializes editedChunks as JSON', () => {
      db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        editedChunks: ['chunk1', 'chunk2']
      });

      const full = db.projects.findById('1001', userId);
      expect(full.edited_chunks).toBe('["chunk1","chunk2"]');
    });

    test('serializes docContent as JSON', () => {
      db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        docContent: { original: 'orig', edited: 'edit', fileName: 'file.docx' }
      });

      const full = db.projects.findById('1001', userId);
      const parsed = JSON.parse(full.doc_content);
      expect(parsed.original).toBe('orig');
      expect(parsed.edited).toBe('edit');
    });

    test('stores null for missing optional fields', () => {
      db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx'
      });

      const full = db.projects.findById('1001', userId);
      expect(full.original_text).toBeNull();
      expect(full.edited_chunks).toBeNull();
      expect(full.full_edited_text).toBeNull();
      expect(full.style_guide).toBeNull();
      expect(full.doc_content).toBeNull();
    });
  });

  describe('findById', () => {
    test('returns project with all fields', () => {
      db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        originalText: 'Original text here',
        editedChunks: ['edited chunk 1'],
        fullEditedText: 'Full edited text',
        styleGuide: 'My style guide',
        isComplete: true,
        chunksCompleted: 5,
        totalChunks: 5,
        chunkSize: 2000
      });

      const project = db.projects.findById('1001', userId);
      expect(project).toBeTruthy();
      expect(project.id).toBe('1001');
      expect(project.file_name).toBe('test.docx');
      expect(project.original_text).toBe('Original text here');
      expect(project.full_edited_text).toBe('Full edited text');
      expect(project.style_guide).toBe('My style guide');
      expect(project.is_complete).toBe(1);
    });

    test('returns undefined for non-existent project', () => {
      const result = db.projects.findById('nonexistent', userId);
      expect(result).toBeUndefined();
    });

    test('does not return another user\'s project', () => {
      const otherUser = db.users.create({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hash456'
      });

      db.projects.save(otherUser.id, {
        id: '2001',
        fileName: 'other.docx'
      });

      const result = db.projects.findById('2001', userId);
      expect(result).toBeUndefined();
    });
  });

  describe('listByUser', () => {
    test('returns empty array for user with no projects', () => {
      const projects = db.projects.listByUser(userId);
      expect(projects).toEqual([]);
    });

    test('returns projects for the user', () => {
      db.projects.save(userId, { id: '1001', fileName: 'first.docx' });
      db.projects.save(userId, { id: '1002', fileName: 'second.docx' });

      const projects = db.projects.listByUser(userId);
      expect(projects).toHaveLength(2);
    });

    test('does not include other users\' projects', () => {
      const otherUser = db.users.create({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hash456'
      });

      db.projects.save(userId, { id: '1001', fileName: 'mine.docx' });
      db.projects.save(otherUser.id, { id: '2001', fileName: 'theirs.docx' });

      const projects = db.projects.listByUser(userId);
      expect(projects).toHaveLength(1);
      expect(projects[0].file_name).toBe('mine.docx');
    });

    test('returns metadata columns only (no text content)', () => {
      db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        originalText: 'Big text blob'
      });

      const projects = db.projects.listByUser(userId);
      expect(projects[0]).not.toHaveProperty('original_text');
      expect(projects[0]).not.toHaveProperty('edited_chunks');
      expect(projects[0]).not.toHaveProperty('full_edited_text');
      expect(projects[0]).not.toHaveProperty('style_guide');
      expect(projects[0]).not.toHaveProperty('doc_content');
    });

    test('includes metadata fields', () => {
      db.projects.save(userId, {
        id: '1001',
        fileName: 'test.docx',
        isComplete: true,
        chunksCompleted: 5,
        totalChunks: 5,
        chunkSize: 2000
      });

      const projects = db.projects.listByUser(userId);
      expect(projects[0].id).toBe('1001');
      expect(projects[0].file_name).toBe('test.docx');
      expect(projects[0].is_complete).toBe(1);
      expect(projects[0].chunks_completed).toBe(5);
      expect(projects[0].total_chunks).toBe(5);
      expect(projects[0].chunk_size).toBe(2000);
      expect(projects[0]).toHaveProperty('created_at');
      expect(projects[0]).toHaveProperty('updated_at');
    });
  });

  describe('delete', () => {
    test('deletes an existing project', () => {
      db.projects.save(userId, { id: '1001', fileName: 'test.docx' });
      const deleted = db.projects.delete('1001', userId);
      expect(deleted).toBe(true);

      const result = db.projects.findById('1001', userId);
      expect(result).toBeUndefined();
    });

    test('returns false for non-existent project', () => {
      const deleted = db.projects.delete('nonexistent', userId);
      expect(deleted).toBe(false);
    });

    test('does not delete another user\'s project', () => {
      const otherUser = db.users.create({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hash456'
      });

      db.projects.save(otherUser.id, { id: '2001', fileName: 'other.docx' });

      const deleted = db.projects.delete('2001', userId);
      expect(deleted).toBe(false);

      // Confirm it still exists for the owner
      const still = db.projects.findById('2001', otherUser.id);
      expect(still).toBeTruthy();
    });
  });

  describe('count', () => {
    test('returns 0 for user with no projects', () => {
      expect(db.projects.count(userId)).toBe(0);
    });

    test('returns correct count', () => {
      db.projects.save(userId, { id: '1001', fileName: 'a.docx' });
      db.projects.save(userId, { id: '1002', fileName: 'b.docx' });
      db.projects.save(userId, { id: '1003', fileName: 'c.docx' });
      expect(db.projects.count(userId)).toBe(3);
    });

    test('counts only the specified user\'s projects', () => {
      const otherUser = db.users.create({
        username: 'other',
        email: 'other@example.com',
        password_hash: 'hash'
      });

      db.projects.save(userId, { id: '1001', fileName: 'mine.docx' });
      db.projects.save(otherUser.id, { id: '2001', fileName: 'theirs.docx' });

      expect(db.projects.count(userId)).toBe(1);
    });
  });

  describe('cascading deletes', () => {
    test('deleting user cascades to their projects', () => {
      db.projects.save(userId, { id: '1001', fileName: 'test.docx' });
      db.projects.save(userId, { id: '1002', fileName: 'test2.docx' });

      expect(db.projects.count(userId)).toBe(2);

      db.users.delete(userId);

      // Projects should be gone
      expect(db.projects.findById('1001', userId)).toBeUndefined();
      expect(db.projects.findById('1002', userId)).toBeUndefined();
    });
  });
});
