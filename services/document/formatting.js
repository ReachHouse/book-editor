/**
 * =============================================================================
 * TEXT FORMATTING
 * =============================================================================
 *
 * Functions for creating formatted text runs with italics parsing
 * and track change markup.
 *
 * NOTE: Insertions rely purely on Word's native Track Changes rendering
 * (blue underline for insertions, red strikethrough for deletions).
 * No explicit formatting (highlight, color, underline) is applied to
 * InsertedTextRun objects, so accepting changes leaves clean text.
 *
 * =============================================================================
 */

const { InsertedTextRun } = require('docx');
const { AUTHOR } = require('./constants');

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
 * Helper to create an InsertedTextRun with optional italics.
 * Only applies italics when the source text is genuinely italic -
 * no highlight or formatting revisions are added.
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

  return new InsertedTextRun(options);
}

/**
 * Create inserted text runs, supporting *italics* markers.
 * Returns array of InsertedTextRun objects with proper formatting.
 *
 * @param {string} text - Text to insert (may contain *italic* markers)
 * @param {number} revisionId - Starting revision ID
 * @param {Date} dateObj - Date for the revision
 * @param {Object} [stats] - Optional stats context to track formatting changes
 * @returns {Object} { runs: Array<InsertedTextRun>, nextRevisionId: number }
 */
function createHighlightedInsertedRuns(text, revisionId, dateObj, stats) {
  if (!text) return { runs: [], nextRevisionId: revisionId };

  // Check for *italics* markers
  const hasItalics = /\*[^*]+\*/.test(text);

  // Track formatting changes in stats if provided
  if (hasItalics && stats) {
    const matches = text.match(/\*[^*]+\*/g);
    if (matches) {
      stats.totalFormattingChanges += matches.length;
    }
  }

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
  createInsertedRunWithOptions,
  createHighlightedInsertedRuns
};
