/** Document Service — Word (.docx) generation with native Track Changes and review comments. */

const { createDocumentWithTrackChanges, generateDocxBuffer } = require('./generation');
const { createTrackedParagraph } = require('./paragraphs');

module.exports = {
  createDocumentWithTrackChanges,
  createTrackedParagraph,
  generateDocxBuffer
};
