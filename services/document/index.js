/**
 * =============================================================================
 * DOCUMENT SERVICE - Word Document Generation with Track Changes & Comments
 * =============================================================================
 *
 * This module generates Microsoft Word (.docx) documents with native
 * Track Changes support AND review comments.
 *
 * MODULAR STRUCTURE:
 * ------------------
 * - constants.js     : Configuration values
 * - utils.js         : Helper functions (countWords, createStatsContext)
 * - categorization.js: Change categorization logic
 * - comments.js      : Summary and inline comment creation
 * - formatting.js    : Text formatting (highlighting, italics)
 * - paragraphs.js    : Paragraph-level track changes
 * - generation.js    : Document creation and buffer generation
 *
 * EXPORTS:
 * --------
 * - createDocumentWithTrackChanges: Create Document object from text pair
 * - createTrackedParagraph: Create single paragraph with word-level tracking
 * - generateDocxBuffer: Full pipeline returning downloadable buffer
 *
 * =============================================================================
 */

const { createDocumentWithTrackChanges, generateDocxBuffer } = require('./generation');
const { createTrackedParagraph } = require('./paragraphs');

module.exports = {
  createDocumentWithTrackChanges,
  createTrackedParagraph,
  generateDocxBuffer
};
