/**
 * =============================================================================
 * TEXT FORMATTING
 * =============================================================================
 *
 * Functions for creating formatted text runs with highlighting,
 * italics parsing, and track change markup.
 *
 * =============================================================================
 */

const { TextRun, InsertedTextRun } = require('docx');
const {
  AUTHOR,
  HIGHLIGHT_INSERTIONS,
  INSERTION_HIGHLIGHT_COLOR
} = require('./constants');

/**
 * Create a highlighted InsertedTextRun for visibility.
 * Combines track change (InsertedTextRun) with formatting revision (highlight).
 *
 * @param {string} text - The inserted text
 * @param {number} revisionId - Revision ID for the insertion
 * @param {Date} dateObj - Date object for the revision
 * @returns {InsertedTextRun} InsertedTextRun with highlight and formatting revision tracked
 */
function createHighlightedInsertedRun(text, revisionId, dateObj) {
  if (!HIGHLIGHT_INSERTIONS) {
    return new InsertedTextRun({
      text: text,
      id: revisionId,
      author: AUTHOR,
      date: dateObj,
    });
  }

  // Return InsertedTextRun with highlight AND formatting revision tracking
  return new InsertedTextRun({
    text: text,
    id: revisionId,
    author: AUTHOR,
    date: dateObj,
    highlight: INSERTION_HIGHLIGHT_COLOR,
    // Track the highlight as a formatting revision
    revision: {
      id: revisionId * 2 + 1, // Odd IDs for formatting to avoid collision
      author: AUTHOR,
      date: dateObj,
    }
  });
}

/**
 * Parse text for markdown-style *italics* and return array of TextRuns.
 * Converts *text* markers to actual Word italics formatting.
 *
 * @param {string} text - Text that may contain *italic* markers
 * @param {Object} baseOptions - Base options for TextRun (e.g., highlight, revision)
 * @returns {Array<TextRun>} Array of TextRuns with appropriate formatting
 */
function parseItalicsToTextRuns(text, baseOptions = {}) {
  if (!text) return [];

  const runs = [];
  const italicPattern = /\*([^*]+)\*/g;

  let lastIndex = 0;
  let match;

  while ((match = italicPattern.exec(text)) !== null) {
    // Add text before the italic marker
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        runs.push(new TextRun({ text: beforeText, ...baseOptions }));
      }
    }

    // Add the italic text (without the * markers)
    const italicText = match[1];
    runs.push(new TextRun({
      text: italicText,
      italics: true,
      ...baseOptions
    }));

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last italic marker
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      runs.push(new TextRun({ text: remainingText, ...baseOptions }));
    }
  }

  // If no italics found, return single TextRun
  if (runs.length === 0) {
    runs.push(new TextRun({ text: text, ...baseOptions }));
  }

  return runs;
}

/**
 * Helper to create an InsertedTextRun with optional italics.
 *
 * @param {string} text - Text content
 * @param {number} revisionId - Revision ID
 * @param {Date} dateObj - Date object
 * @param {boolean} italics - Whether to apply italics
 * @returns {InsertedTextRun} The created run
 */
function createInsertedRunWithOptions(text, revisionId, dateObj, italics) {
  const options = {
    text: text,
    id: revisionId,
    author: AUTHOR,
    date: dateObj,
  };

  if (italics) {
    options.italics = true;
  }

  if (HIGHLIGHT_INSERTIONS) {
    options.highlight = INSERTION_HIGHLIGHT_COLOR;
    options.revision = {
      id: revisionId * 2 + 1,
      author: AUTHOR,
      date: dateObj,
    };
  }

  return new InsertedTextRun(options);
}

/**
 * Create highlighted inserted text runs, supporting *italics* markers.
 * Returns array of InsertedTextRun objects with proper formatting.
 *
 * @param {string} text - Text to insert (may contain *italic* markers)
 * @param {number} revisionId - Starting revision ID
 * @param {Date} dateObj - Date for the revision
 * @returns {Object} { runs: Array<InsertedTextRun>, nextRevisionId: number }
 */
function createHighlightedInsertedRuns(text, revisionId, dateObj) {
  if (!text) return { runs: [], nextRevisionId: revisionId };

  // Check for *italics* markers
  const hasItalics = /\*[^*]+\*/.test(text);

  if (!hasItalics) {
    return {
      runs: [createHighlightedInsertedRun(text, revisionId, dateObj)],
      nextRevisionId: revisionId + 1
    };
  }

  // Parse text for italics and create multiple InsertedTextRuns
  const runs = [];
  const italicPattern = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match;
  let currentRevId = revisionId;

  while ((match = italicPattern.exec(text)) !== null) {
    // Add text before the italic marker
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        runs.push(createInsertedRunWithOptions(beforeText, currentRevId++, dateObj, false));
      }
    }

    // Add the italic text (without the * markers)
    const italicText = match[1];
    runs.push(createInsertedRunWithOptions(italicText, currentRevId++, dateObj, true));

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last italic marker
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      runs.push(createInsertedRunWithOptions(remainingText, currentRevId++, dateObj, false));
    }
  }

  return { runs, nextRevisionId: currentRevId };
}

module.exports = {
  createHighlightedInsertedRun,
  parseItalicsToTextRuns,
  createInsertedRunWithOptions,
  createHighlightedInsertedRuns
};
