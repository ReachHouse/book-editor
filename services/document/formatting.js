/**
 * =============================================================================
 * TEXT FORMATTING
 * =============================================================================
 *
 * Functions for creating formatted text runs with markdown-style parsing
 * and track change markup.
 *
 * SUPPORTED MARKERS:
 * ------------------
 * - *italic*           → italics
 * - **bold**           → bold
 * - ***bold italic***  → bold + italics
 * - _underline_        → underline
 * - __underline__      → underline (alternative)
 * - ~~strikethrough~~  → strikethrough
 *
 * NOTE: Insertions rely purely on Word's native Track Changes rendering
 * (blue underline for insertions, red strikethrough for deletions).
 * The formatting applied here is the actual text formatting that remains
 * after accepting changes.
 *
 * =============================================================================
 */

const { InsertedTextRun } = require('docx');
const { AUTHOR } = require('./constants');

/**
 * Format marker definitions.
 * Order matters - longer/more specific patterns must come first to avoid
 * partial matches (e.g., *** before ** before *).
 */
const FORMAT_MARKERS = [
  // Bold + Italic (must come before bold and italic)
  { pattern: /\*\*\*(.+?)\*\*\*/g, format: { bold: true, italics: true }, name: 'bold+italic' },
  // Bold (must come before italic)
  { pattern: /\*\*(.+?)\*\*/g, format: { bold: true }, name: 'bold' },
  // Italic
  { pattern: /(?<!\*)\*([^*]+)\*(?!\*)/g, format: { italics: true }, name: 'italic' },
  // Strikethrough
  { pattern: /~~(.+?)~~/g, format: { strike: true }, name: 'strikethrough' },
  // Underline (double underscore - must come before single)
  { pattern: /__(.+?)__/g, format: { underline: { type: 'single' } }, name: 'underline' },
  // Underline (single underscore)
  { pattern: /(?<!_)_([^_]+)_(?!_)/g, format: { underline: { type: 'single' } }, name: 'underline' },
];

/**
 * Create an InsertedTextRun for track changes.
 * Uses only Track Changes metadata - no explicit formatting.
 *
 * @param {string} text - The inserted text
 * @param {number} revisionId - Revision ID for the insertion
 * @param {Date} dateObj - Date object for the revision
 * @returns {InsertedTextRun}
 */
function createHighlightedInsertedRun(text, revisionId, dateObj) {
  return new InsertedTextRun({
    text: text,
    id: revisionId,
    author: AUTHOR,
    date: dateObj,
  });
}

/**
 * Helper to create an InsertedTextRun with formatting options.
 *
 * @param {string} text - Text content
 * @param {number} revisionId - Revision ID
 * @param {Date} dateObj - Date object
 * @param {Object} formatting - Formatting options (bold, italics, strike, underline, etc.)
 * @returns {InsertedTextRun} The created run
 */
function createInsertedRunWithOptions(text, revisionId, dateObj, formatting = {}) {
  const options = {
    text: text,
    id: revisionId,
    author: AUTHOR,
    date: dateObj,
    ...formatting
  };

  return new InsertedTextRun(options);
}

/**
 * Check if text contains any formatting markers.
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if any formatting markers found
 */
function hasFormattingMarkers(text) {
  if (!text) return false;

  // Quick check for any potential markers
  return /\*|_|~/.test(text);
}

/**
 * Count formatting markers in text and update stats.
 *
 * @param {string} text - Text to analyze
 * @param {Object} stats - Stats object to update
 */
function countFormattingChanges(text, stats) {
  if (!text || !stats) return;

  // Count each type of formatting marker
  // Use non-overlapping patterns for accurate counting
  const boldItalicMatches = text.match(/\*\*\*[^*]+\*\*\*/g) || [];
  const boldMatches = text.match(/(?<!\*)\*\*(?!\*)[^*]+(?<!\*)\*\*(?!\*)/g) || [];
  const italicMatches = text.match(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g) || [];
  const strikeMatches = text.match(/~~[^~]+~~/g) || [];
  const underlineDoubleMatches = text.match(/__[^_]+__/g) || [];
  const underlineSingleMatches = text.match(/(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g) || [];

  const total = boldItalicMatches.length + boldMatches.length + italicMatches.length +
                strikeMatches.length + underlineDoubleMatches.length + underlineSingleMatches.length;

  stats.totalFormattingChanges += total;
}

/**
 * Parse text with formatting markers into segments.
 * Each segment has text content and associated formatting.
 *
 * @param {string} text - Text to parse
 * @returns {Array<{text: string, formatting: Object}>} Array of text segments
 */
function parseFormattedText(text) {
  if (!text) return [];

  // If no markers, return single unformatted segment
  if (!hasFormattingMarkers(text)) {
    return [{ text, formatting: {} }];
  }

  // Find all format markers and their positions
  const markers = [];

  for (const marker of FORMAT_MARKERS) {
    // Reset lastIndex for global regex
    marker.pattern.lastIndex = 0;
    let match;

    while ((match = marker.pattern.exec(text)) !== null) {
      markers.push({
        start: match.index,
        end: match.index + match[0].length,
        innerText: match[1],
        formatting: marker.format,
        fullMatch: match[0]
      });
    }
  }

  // If no markers found, return unformatted
  if (markers.length === 0) {
    return [{ text, formatting: {} }];
  }

  // Sort by start position
  markers.sort((a, b) => a.start - b.start);

  // Remove overlapping markers (keep first/longer match)
  const filteredMarkers = [];
  let lastEnd = -1;

  for (const marker of markers) {
    if (marker.start >= lastEnd) {
      filteredMarkers.push(marker);
      lastEnd = marker.end;
    }
  }

  // Build segments
  const segments = [];
  let currentPos = 0;

  for (const marker of filteredMarkers) {
    // Add text before this marker
    if (marker.start > currentPos) {
      const beforeText = text.substring(currentPos, marker.start);
      if (beforeText) {
        segments.push({ text: beforeText, formatting: {} });
      }
    }

    // Add the formatted text
    segments.push({ text: marker.innerText, formatting: marker.formatting });
    currentPos = marker.end;
  }

  // Add remaining text after last marker
  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos);
    if (remainingText) {
      segments.push({ text: remainingText, formatting: {} });
    }
  }

  return segments;
}

/**
 * Create inserted text runs, supporting markdown-style formatting markers.
 * Returns array of InsertedTextRun objects with proper formatting.
 *
 * Supported markers:
 * - *italic* → italics
 * - **bold** → bold
 * - ***bold italic*** → bold + italics
 * - _underline_ or __underline__ → underline
 * - ~~strikethrough~~ → strikethrough
 *
 * @param {string} text - Text to insert (may contain formatting markers)
 * @param {number} revisionId - Starting revision ID
 * @param {Date} dateObj - Date for the revision
 * @param {Object} [stats] - Optional stats context to track formatting changes
 * @returns {Object} { runs: Array<InsertedTextRun>, nextRevisionId: number }
 */
function createHighlightedInsertedRuns(text, revisionId, dateObj, stats) {
  if (!text) return { runs: [], nextRevisionId: revisionId };

  // Track formatting changes in stats if provided
  countFormattingChanges(text, stats);

  // If no formatting markers, return single plain run
  if (!hasFormattingMarkers(text)) {
    return {
      runs: [createHighlightedInsertedRun(text, revisionId, dateObj)],
      nextRevisionId: revisionId + 1
    };
  }

  // Parse text into formatted segments
  const segments = parseFormattedText(text);

  // If parsing returned nothing useful, return single plain run
  if (segments.length === 0) {
    return {
      runs: [createHighlightedInsertedRun(text, revisionId, dateObj)],
      nextRevisionId: revisionId + 1
    };
  }

  // Create runs for each segment
  const runs = [];
  let currentRevId = revisionId;

  for (const segment of segments) {
    if (segment.text) {
      runs.push(createInsertedRunWithOptions(
        segment.text,
        currentRevId++,
        dateObj,
        segment.formatting
      ));
    }
  }

  // If no runs created (shouldn't happen), return plain run
  if (runs.length === 0) {
    return {
      runs: [createHighlightedInsertedRun(text, revisionId, dateObj)],
      nextRevisionId: revisionId + 1
    };
  }

  return { runs, nextRevisionId: currentRevId };
}

module.exports = {
  createHighlightedInsertedRun,
  createInsertedRunWithOptions,
  createHighlightedInsertedRuns,
  // Export for testing
  parseFormattedText,
  hasFormattingMarkers,
  FORMAT_MARKERS
};
