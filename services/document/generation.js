/** Document Generation — Creates Word documents with Track Changes, comments, and buffer packing. */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference
} = require('docx');
const { alignParagraphs } = require('../diffService');
const { DISABLE_COMMENTS } = require('./constants');
const { createStatsContext } = require('./utils');
const { createSummaryComment } = require('./comments');
const { createParagraphFromAlignment } = require('./paragraphs');

/**
 * Create a Word document with native Track Changes and Comments.
 *
 * This is the main entry point for document generation. It takes the
 * original and edited text, aligns paragraphs, computes changes, and
 * builds a Document object with proper Track Changes markup and comments.
 *
 * @param {string} original - Original manuscript text
 * @param {string} edited - AI-edited manuscript text
 * @returns {Document} docx Document object ready for packing
 */
function createDocumentWithTrackChanges(original, edited) {
  // Split text into paragraphs (double newlines or single newlines)
  const originalParas = original.split(/\n+/).filter(p => p.trim());
  const editedParas = edited.split(/\n+/).filter(p => p.trim());

  // Align paragraphs using LCS-based algorithm from diffService
  const alignedParagraphs = alignParagraphs(originalParas, editedParas);

  // Initialize tracking context
  const stats = createStatsContext();
  const comments = [];
  const timestamp = new Date().toISOString();

  // Build Word paragraphs from aligned pairs
  const paragraphData = [];
  let revisionId = 0;
  let commentId = 1; // Start at 1, reserve 0 for summary comment

  for (const aligned of alignedParagraphs) {
    const result = createParagraphFromAlignment(
      aligned,
      revisionId,
      commentId,
      timestamp,
      stats,
      comments
    );
    paragraphData.push({
      paragraph: result.paragraph
    });
    revisionId = result.nextRevisionId;
    commentId = result.nextCommentId;
  }

  // Build final paragraphs array
  const paragraphs = [];

  // If comments are disabled, just add paragraphs without any comment markup
  if (DISABLE_COMMENTS) {
    for (const data of paragraphData) {
      paragraphs.push(data.paragraph);
    }

    return new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });
  }

  // Add summary comment as a SEPARATE paragraph if there are changes
  if (stats.totalInsertions > 0 || stats.totalDeletions > 0) {
    const summaryComment = createSummaryComment(stats, timestamp);
    comments.unshift(summaryComment);

    // Create a dedicated summary paragraph with its own comment markers
    paragraphs.push(new Paragraph({
      children: [
        new CommentRangeStart(0),
        new TextRun({
          text: "AI Editor Summary",
          bold: true
        }),
        new CommentRangeEnd(0),
        new CommentReference(0)
      ]
    }));

    // Add paragraph with space for visual separation
    paragraphs.push(new Paragraph({
      children: [new TextRun(" ")]
    }));

    // Add ALL content paragraphs as-is
    for (const data of paragraphData) {
      paragraphs.push(data.paragraph);
    }
  } else {
    // No changes - use paragraphs as-is
    for (const data of paragraphData) {
      paragraphs.push(data.paragraph);
    }
  }

  // Create and return Document with comments
  return new Document({
    comments: {
      children: comments
    },
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
}

/**
 * Generate a downloadable .docx buffer from original and edited text.
 *
 * This is the main function called by the API route.
 *
 * @param {string} originalText - Original manuscript text
 * @param {string} editedText - AI-edited manuscript text
 * @returns {Promise<Buffer>} Binary buffer ready for HTTP response
 */
async function generateDocxBuffer(originalText, editedText) {
  const doc = createDocumentWithTrackChanges(originalText, editedText);
  return await Packer.toBuffer(doc);
}

module.exports = {
  createDocumentWithTrackChanges,
  generateDocxBuffer
};
