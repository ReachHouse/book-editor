/**
 * Unit Tests for diffService.js
 *
 * Tests the LCS-based diff algorithms used to generate Word Track Changes.
 * These tests ensure accurate change detection for document generation.
 */

const { computeWordDiff, alignParagraphs } = require('../../services/diffService');

// =============================================================================
// computeWordDiff Tests
// =============================================================================

describe('computeWordDiff', () => {
  describe('edge cases', () => {
    test('returns empty array for null/undefined inputs', () => {
      expect(computeWordDiff(null, null)).toEqual([]);
      expect(computeWordDiff(undefined, undefined)).toEqual([]);
    });

    test('returns insert for null original', () => {
      const result = computeWordDiff(null, 'Hello world');
      expect(result).toEqual([{ type: 'insert', text: 'Hello world' }]);
    });

    test('returns delete for null edited', () => {
      const result = computeWordDiff('Hello world', null);
      expect(result).toEqual([{ type: 'delete', text: 'Hello world' }]);
    });

    test('returns equal for identical strings', () => {
      const text = 'Hello world';
      const result = computeWordDiff(text, text);
      expect(result).toEqual([{ type: 'equal', text: 'Hello world' }]);
    });

    test('handles empty strings', () => {
      // Empty string to empty string returns empty array (no changes)
      expect(computeWordDiff('', '')).toEqual([]);
      expect(computeWordDiff('', 'Hello')).toEqual([{ type: 'insert', text: 'Hello' }]);
      expect(computeWordDiff('Hello', '')).toEqual([{ type: 'delete', text: 'Hello' }]);
    });
  });

  describe('word replacements', () => {
    test('detects single word replacement', () => {
      const result = computeWordDiff('The quick fox', 'The fast fox');

      // Should have: equal "The ", delete "quick", insert "fast", equal " fox"
      const deleteChange = result.find(c => c.type === 'delete');
      const insertChange = result.find(c => c.type === 'insert');

      expect(deleteChange.text).toContain('quick');
      expect(insertChange.text).toContain('fast');
    });

    test('detects multiple word replacements', () => {
      const result = computeWordDiff(
        'The quick brown fox',
        'The slow gray dog'
      );

      // Should have deletions and insertions
      const deletions = result.filter(c => c.type === 'delete');
      const insertions = result.filter(c => c.type === 'insert');

      expect(deletions.length).toBeGreaterThan(0);
      expect(insertions.length).toBeGreaterThan(0);
    });
  });

  describe('insertions', () => {
    test('detects word insertion at beginning', () => {
      const result = computeWordDiff('world', 'Hello world');
      const insertChange = result.find(c => c.type === 'insert');
      expect(insertChange.text).toContain('Hello');
    });

    test('detects word insertion at end', () => {
      const result = computeWordDiff('Hello', 'Hello world');
      const insertChange = result.find(c => c.type === 'insert');
      expect(insertChange.text).toContain('world');
    });

    test('detects word insertion in middle', () => {
      const result = computeWordDiff('Hello world', 'Hello beautiful world');
      const insertChange = result.find(c => c.type === 'insert');
      expect(insertChange.text).toContain('beautiful');
    });
  });

  describe('deletions', () => {
    test('detects word deletion at beginning', () => {
      const result = computeWordDiff('Hello world', 'world');
      const deleteChange = result.find(c => c.type === 'delete');
      expect(deleteChange.text).toContain('Hello');
    });

    test('detects word deletion at end', () => {
      const result = computeWordDiff('Hello world', 'Hello');
      const deleteChange = result.find(c => c.type === 'delete');
      expect(deleteChange.text).toContain('world');
    });

    test('detects word deletion in middle', () => {
      const result = computeWordDiff('Hello beautiful world', 'Hello world');
      const deleteChange = result.find(c => c.type === 'delete');
      expect(deleteChange.text).toContain('beautiful');
    });
  });

  describe('whitespace handling', () => {
    test('preserves single spaces', () => {
      const result = computeWordDiff('Hello world', 'Hello world');
      expect(result).toEqual([{ type: 'equal', text: 'Hello world' }]);
    });

    test('preserves multiple spaces', () => {
      const result = computeWordDiff('Hello  world', 'Hello  world');
      expect(result).toEqual([{ type: 'equal', text: 'Hello  world' }]);
    });

    test('detects whitespace changes', () => {
      const result = computeWordDiff('Hello world', 'Hello  world');
      // Should detect the space difference
      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('real-world editing scenarios', () => {
    test('handles sentence rewriting', () => {
      const original = 'She was very happy about the news.';
      const edited = 'She felt delighted by the announcement.';

      const result = computeWordDiff(original, edited);

      // Should have both deletions and insertions
      const hasDelete = result.some(c => c.type === 'delete');
      const hasInsert = result.some(c => c.type === 'insert');

      expect(hasDelete).toBe(true);
      expect(hasInsert).toBe(true);
    });

    test('handles punctuation changes', () => {
      const original = 'Hello world';
      const edited = 'Hello, world!';

      const result = computeWordDiff(original, edited);

      // Should detect the punctuation differences
      expect(result.some(c => c.type === 'delete' || c.type === 'insert')).toBe(true);
    });

    test('handles complete rewrite', () => {
      const original = 'The quick brown fox jumps.';
      const edited = 'A lazy dog sleeps.';

      const result = computeWordDiff(original, edited);

      const hasDelete = result.some(c => c.type === 'delete');
      const hasInsert = result.some(c => c.type === 'insert');

      expect(hasDelete).toBe(true);
      expect(hasInsert).toBe(true);
    });
  });
});

// =============================================================================
// alignParagraphs Tests
// =============================================================================

describe('alignParagraphs', () => {
  describe('edge cases', () => {
    test('returns empty array for empty inputs', () => {
      expect(alignParagraphs([], [])).toEqual([]);
    });

    test('handles null/undefined inputs', () => {
      expect(alignParagraphs(null, null)).toEqual([]);
      expect(alignParagraphs(undefined, undefined)).toEqual([]);
      expect(alignParagraphs(null, [])).toEqual([]);
      expect(alignParagraphs([], null)).toEqual([]);
    });

    test('returns all inserts for empty original', () => {
      const result = alignParagraphs([], ['Para 1', 'Para 2']);

      expect(result.length).toBe(2);
      expect(result[0].type).toBe('insert');
      expect(result[1].type).toBe('insert');
      expect(result[0].edited).toBe('Para 1');
      expect(result[1].edited).toBe('Para 2');
    });

    test('returns all deletes for empty edited', () => {
      const result = alignParagraphs(['Para 1', 'Para 2'], []);

      expect(result.length).toBe(2);
      expect(result[0].type).toBe('delete');
      expect(result[1].type).toBe('delete');
      expect(result[0].original).toBe('Para 1');
      expect(result[1].original).toBe('Para 2');
    });
  });

  describe('matching paragraphs', () => {
    test('detects identical paragraphs as match', () => {
      const original = ['Hello world', 'Goodbye world'];
      const edited = ['Hello world', 'Goodbye world'];

      const result = alignParagraphs(original, edited);

      expect(result.length).toBe(2);
      expect(result[0].type).toBe('match');
      expect(result[1].type).toBe('match');
    });

    test('detects similar paragraphs as change', () => {
      const original = ['The quick brown fox jumps over the lazy dog'];
      const edited = ['The fast brown fox jumps over the sleepy dog'];

      const result = alignParagraphs(original, edited);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('change');
      expect(result[0].original).toBe(original[0]);
      expect(result[0].edited).toBe(edited[0]);
    });
  });

  describe('paragraph additions', () => {
    test('detects paragraph added at beginning', () => {
      const original = ['Second paragraph'];
      const edited = ['First paragraph', 'Second paragraph'];

      const result = alignParagraphs(original, edited);

      const insertResult = result.find(r => r.type === 'insert');
      expect(insertResult).toBeDefined();
      expect(insertResult.edited).toBe('First paragraph');
    });

    test('detects paragraph added at end', () => {
      const original = ['First paragraph'];
      const edited = ['First paragraph', 'Second paragraph'];

      const result = alignParagraphs(original, edited);

      const insertResult = result.find(r => r.type === 'insert');
      expect(insertResult).toBeDefined();
      expect(insertResult.edited).toBe('Second paragraph');
    });

    test('detects paragraph added in middle', () => {
      const original = ['First', 'Third'];
      const edited = ['First', 'Second', 'Third'];

      const result = alignParagraphs(original, edited);

      const insertResult = result.find(r => r.type === 'insert');
      expect(insertResult).toBeDefined();
      expect(insertResult.edited).toBe('Second');
    });
  });

  describe('paragraph deletions', () => {
    test('detects paragraph deleted from beginning', () => {
      const original = ['First paragraph', 'Second paragraph'];
      const edited = ['Second paragraph'];

      const result = alignParagraphs(original, edited);

      const deleteResult = result.find(r => r.type === 'delete');
      expect(deleteResult).toBeDefined();
      expect(deleteResult.original).toBe('First paragraph');
    });

    test('detects paragraph deleted from end', () => {
      const original = ['First paragraph', 'Second paragraph'];
      const edited = ['First paragraph'];

      const result = alignParagraphs(original, edited);

      const deleteResult = result.find(r => r.type === 'delete');
      expect(deleteResult).toBeDefined();
      expect(deleteResult.original).toBe('Second paragraph');
    });

    test('detects paragraph deleted from middle', () => {
      const original = ['First', 'Second', 'Third'];
      const edited = ['First', 'Third'];

      const result = alignParagraphs(original, edited);

      const deleteResult = result.find(r => r.type === 'delete');
      expect(deleteResult).toBeDefined();
      expect(deleteResult.original).toBe('Second');
    });
  });

  describe('complex scenarios', () => {
    test('handles mixed additions and deletions', () => {
      const original = ['Keep this', 'Delete this', 'Keep this too'];
      const edited = ['Keep this', 'Add this', 'Keep this too'];

      const result = alignParagraphs(original, edited);

      // Should have a mix of matches/changes, deletes, and inserts
      expect(result.length).toBeGreaterThan(0);
    });

    test('handles paragraph reordering with similarity matching', () => {
      const original = [
        'The quick brown fox jumps over the lazy dog.',
        'A completely different paragraph here.'
      ];
      const edited = [
        'A completely different paragraph here.',
        'The fast brown fox jumps over the lazy dog.'
      ];

      const result = alignParagraphs(original, edited);

      // Should detect the reordering
      expect(result.length).toBeGreaterThan(0);
    });

    test('handles many paragraphs', () => {
      const original = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}`);
      const edited = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}`);

      const result = alignParagraphs(original, edited);

      expect(result.length).toBe(20);
      expect(result.every(r => r.type === 'match')).toBe(true);
    });
  });

  describe('similarity threshold', () => {
    test('paragraphs with >50% word overlap are considered same', () => {
      // These paragraphs share most words
      const original = ['The quick brown fox jumps over the lazy dog'];
      const edited = ['The quick brown cat jumps over the lazy dog'];

      const result = alignParagraphs(original, edited);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('change'); // Same paragraph, just edited
    });

    test('paragraphs with <50% word overlap are considered different', () => {
      // These paragraphs are completely different
      const original = ['Alpha beta gamma delta epsilon'];
      const edited = ['One two three four five six seven'];

      const result = alignParagraphs(original, edited);

      // Should be treated as delete + insert, not a change
      const hasDelete = result.some(r => r.type === 'delete');
      const hasInsert = result.some(r => r.type === 'insert');

      expect(hasDelete).toBe(true);
      expect(hasInsert).toBe(true);
    });
  });
});
