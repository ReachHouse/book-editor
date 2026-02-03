/**
 * =============================================================================
 * DOCUMENT SERVICE UTILITIES
 * =============================================================================
 *
 * Helper functions for document generation.
 * Statistics tracking, word counting, and text analysis.
 *
 * =============================================================================
 */

/**
 * Create a new statistics tracking context.
 * Used to collect data for the summary comment.
 *
 * @returns {Object} Statistics context
 */
function createStatsContext() {
  return {
    totalInsertions: 0,
    totalDeletions: 0,
    totalFormattingChanges: 0,
    paragraphsAdded: 0,
    paragraphsRemoved: 0,
    paragraphsModified: 0,
    wordsInserted: 0,
    wordsDeleted: 0,
    significantChanges: [],
    styleRulesApplied: new Set()
  };
}

/**
 * Count words in a text string.
 *
 * @param {string} text - Text to count words in
 * @returns {number} Word count
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Check if text contains only whitespace.
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if empty or whitespace-only
 */
function isWhitespaceOnly(text) {
  return !text || text.trim().length === 0;
}

module.exports = {
  createStatsContext,
  countWords,
  isWhitespaceOnly
};
