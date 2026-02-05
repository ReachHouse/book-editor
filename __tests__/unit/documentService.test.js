/**
 * Unit Tests for documentService.js
 *
 * Tests the Word document generation with Track Changes and Comments.
 * Includes regression tests for the "children is not iterable" bug fix.
 */

const {
  createDocumentWithTrackChanges,
  createTrackedParagraph,
  generateDocxBuffer
} = require('../../services/document');
const { createHighlightedInsertedRuns } = require('../../services/document/formatting');

// =============================================================================
// generateDocxBuffer Tests (Main API)
// =============================================================================

describe('generateDocxBuffer', () => {
  describe('basic functionality', () => {
    test('returns a Buffer', async () => {
      const original = 'Hello world';
      const edited = 'Hello there';

      const buffer = await generateDocxBuffer(original, edited);

      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    test('buffer has non-zero length', async () => {
      const original = 'Hello world';
      const edited = 'Hello there';

      const buffer = await generateDocxBuffer(original, edited);

      expect(buffer.length).toBeGreaterThan(0);
    });

    test('buffer starts with DOCX magic bytes (PK zip)', async () => {
      const original = 'Hello world';
      const edited = 'Hello there';

      const buffer = await generateDocxBuffer(original, edited);

      // DOCX files are ZIP archives starting with PK (0x50 0x4B)
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4B); // K
    });
  });

  describe('regression: children is not iterable (v1.4.0 fix)', () => {
    test('does not throw "children is not iterable" error', async () => {
      const original = 'The morning sun cast long shadows across the garden.';
      const edited = 'The morning sunlight cast long, dramatic shadows across the garden.';

      // This was the exact error from v1.3.x
      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles complex multi-paragraph documents', async () => {
      const original = `Chapter One

The morning sun cast long shadows across the garden. Sarah walked slowly through the dew-covered grass.

She had always been careful, perhaps too careful. But now everything was different.`;

      const edited = `Chapter One

The morning sunlight cast long, dramatic shadows across the garden. Sarah walked deliberately through the dew-laden grass.

She had always been cautious, perhaps overly so. But now everything had shifted.`;

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles documents with many changes', async () => {
      const original = 'One two three four five six seven eight nine ten';
      const edited = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles complete paragraph replacement', async () => {
      const original = 'This paragraph will be completely replaced.';
      const edited = 'A totally different paragraph with new content.';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('handles empty strings', async () => {
      await expect(generateDocxBuffer('', '')).resolves.not.toThrow();
    });

    test('handles identical text (no changes)', async () => {
      const text = 'This text is identical in both versions.';

      const buffer = await generateDocxBuffer(text, text);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('handles text with only insertions', async () => {
      const original = '';
      const edited = 'This is all new content that was added.';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles text with only deletions', async () => {
      const original = 'This content will all be deleted.';
      const edited = '';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles special characters', async () => {
      const original = 'Hello "world" — with special chars & symbols!';
      const edited = 'Hello "universe" — with special chars & symbols!';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles unicode characters', async () => {
      const original = 'Hello world with emoji';
      const edited = 'Hello world with different text';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles very long paragraphs', async () => {
      const longText = 'word '.repeat(500);
      const original = longText;
      const edited = longText.replace('word', 'text');

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });
  });

  describe('comment generation', () => {
    test('generates document with changes (comments should be included)', async () => {
      const original = 'The quick brown fox jumps over the lazy dog.';
      const edited = 'The fast brown fox leaps over the sleepy dog.';

      const buffer = await generateDocxBuffer(original, edited);

      // Document should be larger than minimal due to comments
      expect(buffer.length).toBeGreaterThan(1000);
    });
  });

  describe('italics rendering (v1.8.1 fix)', () => {
    test('handles text with *italics* markers without throwing', async () => {
      const original = 'The status quo must change.';
      const edited = 'The *status quo* must change.';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles multiple *italic* sections', async () => {
      const original = 'She thought, This is strange. The ubuntu philosophy guides us.';
      const edited = 'She thought, *This is strange.* The *ubuntu* philosophy guides us.';

      const buffer = await generateDocxBuffer(original, edited);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('handles book titles in italics', async () => {
      const original = 'I read The Great Gatsby last summer.';
      const edited = 'I read *The Great Gatsby* last summer.';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });

    test('handles mixed italics and non-italics insertions', async () => {
      const original = 'The old text here.';
      const edited = 'The *new italicized* text and normal text here.';

      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });
  });
});

// =============================================================================
// createDocumentWithTrackChanges Tests
// =============================================================================

describe('createDocumentWithTrackChanges', () => {
  test('returns a Document object', () => {
    const original = 'Hello world';
    const edited = 'Hello there';

    const doc = createDocumentWithTrackChanges(original, edited);

    expect(doc).toBeDefined();
    // docx library uses 'File' as the constructor name for Document
    expect(['Document', 'File']).toContain(doc.constructor.name);
  });

  test('handles single paragraph', () => {
    const original = 'Single paragraph here.';
    const edited = 'Single modified paragraph here.';

    const doc = createDocumentWithTrackChanges(original, edited);

    expect(doc).toBeDefined();
  });

  test('handles multiple paragraphs', () => {
    const original = 'First paragraph.\n\nSecond paragraph.';
    const edited = 'First modified paragraph.\n\nSecond modified paragraph.';

    const doc = createDocumentWithTrackChanges(original, edited);

    expect(doc).toBeDefined();
  });

  test('handles paragraph additions', () => {
    const original = 'First paragraph.';
    const edited = 'First paragraph.\n\nSecond new paragraph.';

    const doc = createDocumentWithTrackChanges(original, edited);

    expect(doc).toBeDefined();
  });

  test('handles paragraph deletions', () => {
    const original = 'First paragraph.\n\nSecond paragraph.';
    const edited = 'First paragraph.';

    const doc = createDocumentWithTrackChanges(original, edited);

    expect(doc).toBeDefined();
  });
});

// =============================================================================
// createTrackedParagraph Tests (Backwards Compatibility)
// =============================================================================

describe('createTrackedParagraph', () => {
  test('returns paragraph and nextId', () => {
    const original = 'Hello world';
    const edited = 'Hello there';
    const startId = 0;
    const timestamp = new Date().toISOString();
    const author = 'Test Author';

    const result = createTrackedParagraph(original, edited, startId, timestamp, author);

    expect(result).toHaveProperty('paragraph');
    expect(result).toHaveProperty('nextId');
    expect(typeof result.nextId).toBe('number');
  });

  test('paragraph is a Paragraph instance', () => {
    const original = 'Hello world';
    const edited = 'Hello there';

    const result = createTrackedParagraph(original, edited, 0, new Date().toISOString(), 'Author');

    expect(result.paragraph).toBeDefined();
    expect(result.paragraph.constructor.name).toBe('Paragraph');
  });

  test('nextId increments for each change', () => {
    const original = 'One two three';
    const edited = 'Alpha beta gamma';

    const result = createTrackedParagraph(original, edited, 0, new Date().toISOString(), 'Author');

    // With multiple changes, nextId should be > 0
    expect(result.nextId).toBeGreaterThan(0);
  });

  test('nextId stays same for identical text', () => {
    const text = 'Identical text';

    const result = createTrackedParagraph(text, text, 5, new Date().toISOString(), 'Author');

    // No changes, nextId should stay at startId
    expect(result.nextId).toBe(5);
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('performance', () => {
  test('handles moderately large documents in reasonable time', async () => {
    // Generate a document with ~50 paragraphs
    const paragraphs = Array.from({ length: 50 }, (_, i) =>
      `This is paragraph number ${i + 1} with some content that might be edited.`
    );

    const original = paragraphs.join('\n\n');
    const edited = paragraphs.map(p => p.replace('content', 'material')).join('\n\n');

    const startTime = Date.now();
    await generateDocxBuffer(original, edited);
    const endTime = Date.now();

    // Should complete in under 5 seconds
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

// =============================================================================
// Formatting Stats Counter Tests (v1.44.2)
// =============================================================================

describe('formatting stats counter', () => {
  test('increments totalFormattingChanges for each italic section', () => {
    const stats = { totalFormattingChanges: 0 };
    createHighlightedInsertedRuns('The *status quo* and *prima facie* case', 1, new Date(), stats);
    expect(stats.totalFormattingChanges).toBe(2);
  });

  test('does not increment when no italics present', () => {
    const stats = { totalFormattingChanges: 0 };
    createHighlightedInsertedRuns('Plain text without any formatting', 1, new Date(), stats);
    expect(stats.totalFormattingChanges).toBe(0);
  });

  test('handles single italic section', () => {
    const stats = { totalFormattingChanges: 0 };
    createHighlightedInsertedRuns('Read *The Great Gatsby* last summer', 1, new Date(), stats);
    expect(stats.totalFormattingChanges).toBe(1);
  });

  test('works without stats parameter (backwards compatible)', () => {
    // Should not throw when stats is not provided
    expect(() => {
      createHighlightedInsertedRuns('The *status quo* must change', 1, new Date());
    }).not.toThrow();
  });

  test('handles empty text', () => {
    const stats = { totalFormattingChanges: 0 };
    const result = createHighlightedInsertedRuns('', 1, new Date(), stats);
    expect(stats.totalFormattingChanges).toBe(0);
    expect(result.runs).toHaveLength(0);
  });
});

// =============================================================================
// Comprehensive Formatting Tests (v1.45.0)
// =============================================================================

const { parseFormattedText } = require('../../services/document/formatting');

describe('comprehensive formatting support', () => {
  describe('bold formatting (**text**)', () => {
    test('parses **text** as bold', () => {
      const segments = parseFormattedText('This is **bold** text');
      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ text: 'This is ', formatting: {} });
      expect(segments[1]).toEqual({ text: 'bold', formatting: { bold: true } });
      expect(segments[2]).toEqual({ text: ' text', formatting: {} });
    });

    test('creates correct number of runs for bold', () => {
      const result = createHighlightedInsertedRuns('This is **bold** text', 1, new Date());
      expect(result.runs).toHaveLength(3);
    });

    test('counts bold in stats', () => {
      const stats = { totalFormattingChanges: 0 };
      createHighlightedInsertedRuns('Make this **important**', 1, new Date(), stats);
      expect(stats.totalFormattingChanges).toBe(1);
    });
  });

  describe('underline formatting (_text_ and __text__)', () => {
    test('parses _text_ as underline', () => {
      const segments = parseFormattedText('This is _underlined_ text');
      expect(segments).toHaveLength(3);
      expect(segments[1]).toEqual({ text: 'underlined', formatting: { underline: { type: 'single' } } });
    });

    test('parses __text__ as underline', () => {
      const segments = parseFormattedText('This is __underlined__ text');
      expect(segments).toHaveLength(3);
      expect(segments[1]).toEqual({ text: 'underlined', formatting: { underline: { type: 'single' } } });
    });

    test('creates correct number of runs for underline', () => {
      const result = createHighlightedInsertedRuns('This is _underlined_ text', 1, new Date());
      expect(result.runs).toHaveLength(3);
    });

    test('counts underline in stats', () => {
      const stats = { totalFormattingChanges: 0 };
      createHighlightedInsertedRuns('Make this _emphasized_', 1, new Date(), stats);
      expect(stats.totalFormattingChanges).toBe(1);
    });
  });

  describe('strikethrough formatting (~~text~~)', () => {
    test('parses ~~text~~ as strikethrough', () => {
      const segments = parseFormattedText('This is ~~deleted~~ text');
      expect(segments).toHaveLength(3);
      expect(segments[1]).toEqual({ text: 'deleted', formatting: { strike: true } });
    });

    test('creates correct number of runs for strikethrough', () => {
      const result = createHighlightedInsertedRuns('This is ~~deleted~~ text', 1, new Date());
      expect(result.runs).toHaveLength(3);
    });

    test('counts strikethrough in stats', () => {
      const stats = { totalFormattingChanges: 0 };
      createHighlightedInsertedRuns('Remove ~~this part~~', 1, new Date(), stats);
      expect(stats.totalFormattingChanges).toBe(1);
    });
  });

  describe('bold+italic formatting (***text***)', () => {
    test('parses ***text*** as bold+italic', () => {
      const segments = parseFormattedText('This is ***very important*** text');
      expect(segments).toHaveLength(3);
      expect(segments[1]).toEqual({ text: 'very important', formatting: { bold: true, italics: true } });
    });

    test('creates correct number of runs for bold+italic', () => {
      const result = createHighlightedInsertedRuns('This is ***very important*** text', 1, new Date());
      expect(result.runs).toHaveLength(3);
    });

    test('counts bold+italic in stats', () => {
      const stats = { totalFormattingChanges: 0 };
      createHighlightedInsertedRuns('This is ***critical***', 1, new Date(), stats);
      expect(stats.totalFormattingChanges).toBe(1);
    });
  });

  describe('mixed formatting in same text', () => {
    test('handles multiple different format types', () => {
      const stats = { totalFormattingChanges: 0 };
      const result = createHighlightedInsertedRuns(
        'Text with *italic* and **bold** and ~~strike~~ formatting',
        1,
        new Date(),
        stats
      );
      // Should have: "Text with ", italic, " and ", bold, " and ", strike, " formatting"
      expect(result.runs.length).toBeGreaterThan(5);
      expect(stats.totalFormattingChanges).toBe(3);
    });

    test('parses multiple formats correctly', () => {
      const segments = parseFormattedText('*italic* and **bold**');
      expect(segments.length).toBeGreaterThanOrEqual(3);
      // Find the italic and bold segments
      const italicSeg = segments.find(s => s.formatting.italics);
      const boldSeg = segments.find(s => s.formatting.bold);
      expect(italicSeg).toBeDefined();
      expect(boldSeg).toBeDefined();
    });

    test('handles adjacent formatting markers', () => {
      const result = createHighlightedInsertedRuns('*italic***bold**', 1, new Date());
      expect(result.runs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    test('handles asterisks in math expressions', () => {
      // Single asterisks without pairs shouldn't match
      const result = createHighlightedInsertedRuns('5 * 3 = 15', 1, new Date());
      expect(result.runs).toHaveLength(1);
    });

    test('handles underscores in variable names', () => {
      // variable_name shouldn't be underlined if there's only one underscore
      const result = createHighlightedInsertedRuns('my_variable_name', 1, new Date());
      // This might match _variable_ but that's expected markdown behavior
      expect(result.runs.length).toBeGreaterThanOrEqual(1);
    });

    test('handles empty formatting markers', () => {
      // ** ** shouldn't crash
      expect(() => {
        createHighlightedInsertedRuns('text ** ** more', 1, new Date());
      }).not.toThrow();
    });

    test('does not throw on document generation with formatting', async () => {
      const original = 'The status quo must change.';
      const edited = 'The *status quo* must **definitely** change with _emphasis_ and ~~removed~~.';
      await expect(generateDocxBuffer(original, edited)).resolves.not.toThrow();
    });
  });
});
