/**
 * =============================================================================
 * DOCUMENT SERVICE - Word Document Generation with Track Changes
 * =============================================================================
 *
 * This service generates Microsoft Word (.docx) documents with native
 * Track Changes support. When opened in Word, users can accept/reject
 * individual changes just like human-edited documents.
 *
 * TRACK CHANGES IMPLEMENTATION:
 * -----------------------------
 * Uses the 'docx' npm library which provides:
 * - InsertedTextRun: Blue underlined text (additions)
 * - DeletedTextRun: Red strikethrough text (deletions)
 * - TextRun: Normal unchanged text
 *
 * Each revision has:
 * - Unique ID (incrementing integer)
 * - Author name ("AI Editor")
 * - Timestamp (ISO format)
 *
 * PROCESSING FLOW:
 * ----------------
 * 1. Split original and edited text into paragraphs
 * 2. Align paragraphs using diffService.alignParagraphs()
 * 3. For each aligned pair:
 *    - 'match': Add as normal TextRun
 *    - 'delete': Add entire paragraph as DeletedTextRun
 *    - 'insert': Add entire paragraph as InsertedTextRun
 *    - 'change': Compute word-level diff, add mixed TextRuns
 * 4. Pack into .docx buffer for download
 *
 * WHY PARAGRAPH ALIGNMENT MATTERS:
 * --------------------------------
 * If we just did word-level diff on the entire document, merged or split
 * paragraphs would produce nonsensical Track Changes. The two-phase
 * approach (paragraph alignment → word diff) ensures accurate results.
 *
 * EXPORTS:
 * --------
 * - createDocumentWithTrackChanges: Create Document object from text pair
 * - createTrackedParagraph: Create single paragraph with word-level tracking
 * - generateDocxBuffer: Full pipeline returning downloadable buffer
 *
 * =============================================================================
 */

const { Document, Packer, Paragraph, TextRun, InsertedTextRun, DeletedTextRun } = require('docx');
const { alignParagraphs, computeWordDiff } = require('./diffService');

// =============================================================================
// DOCUMENT CREATION
// =============================================================================

/**
 * Create a Word document with native Track Changes.
 *
 * This is the main entry point for document generation. It takes the
 * original and edited text, aligns paragraphs, computes changes, and
 * builds a Document object with proper Track Changes markup.
 *
 * @param {string} original - Original manuscript text
 * @param {string} edited - AI-edited manuscript text
 * @returns {Document} docx Document object ready for packing
 */
function createDocumentWithTrackChanges(original, edited) {
  // Split text into paragraphs (double newlines or single newlines)
  // Filter out empty paragraphs
  const originalParas = original.split(/\n+/).filter(p => p.trim());
  const editedParas = edited.split(/\n+/).filter(p => p.trim());

  // Align paragraphs using LCS-based algorithm from diffService
  // This handles added, removed, and reordered paragraphs
  const alignedParagraphs = alignParagraphs(originalParas, editedParas);

  // Build Word paragraphs from aligned pairs
  const paragraphs = [];
  let revisionId = 0; // Each change needs a unique ID
  const timestamp = new Date().toISOString(); // Same timestamp for all changes
  const author = "AI Editor"; // Author shown in Word's Track Changes

  for (const aligned of alignedParagraphs) {
    const result = createParagraphFromAlignment(aligned, revisionId, timestamp, author);
    paragraphs.push(result.paragraph);
    revisionId = result.nextId; // Increment for next revision
  }

  // Create and return Document with single section containing all paragraphs
  return new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
}

// =============================================================================
// PARAGRAPH CREATION
// =============================================================================

/**
 * Create a Word paragraph from an aligned paragraph pair.
 *
 * Handles four alignment types differently:
 * - match: No changes, plain text
 * - delete: Entire paragraph deleted (red strikethrough)
 * - insert: Entire paragraph added (blue underline)
 * - change: Word-level changes within paragraph
 *
 * @param {Object} aligned - Aligned paragraph pair from diffService
 * @param {number} startId - Starting revision ID
 * @param {string} timestamp - ISO timestamp for revisions
 * @param {string} author - Author name for revisions
 * @returns {Object} { paragraph: Paragraph, nextId: number }
 */
function createParagraphFromAlignment(aligned, startId, timestamp, author) {
  let currentId = startId;

  switch (aligned.type) {
    case 'match':
      // Paragraphs are identical - no Track Changes needed
      return {
        paragraph: new Paragraph({
          children: [new TextRun({ text: aligned.original })]
        }),
        nextId: currentId
      };

    case 'delete':
      // Entire paragraph was removed
      // Shows as red strikethrough in Word
      return {
        paragraph: new Paragraph({
          children: [
            new DeletedTextRun({
              text: aligned.original,
              id: currentId++,
              author,
              date: timestamp,
            })
          ]
        }),
        nextId: currentId
      };

    case 'insert':
      // Entire paragraph is new
      // Shows as blue underline in Word
      return {
        paragraph: new Paragraph({
          children: [
            new InsertedTextRun({
              text: aligned.edited,
              id: currentId++,
              author,
              date: timestamp,
            })
          ]
        }),
        nextId: currentId
      };

    case 'change':
      // Paragraph exists in both but has changes
      // Need word-level diff for detailed tracking
      return createTrackedParagraph(aligned.original, aligned.edited, currentId, timestamp, author);

    default:
      // Fallback - shouldn't happen, but handle gracefully
      return {
        paragraph: new Paragraph({
          children: [new TextRun({ text: aligned.original || aligned.edited || '' })]
        }),
        nextId: currentId
      };
  }
}

/**
 * Create a paragraph with word-level Track Changes.
 *
 * Called when a paragraph has been modified (not added/removed entirely).
 * Uses diffService.computeWordDiff() to find individual word changes,
 * then converts each change to the appropriate TextRun type.
 *
 * @param {string} original - Original paragraph text
 * @param {string} edited - Edited paragraph text
 * @param {number} startId - Starting revision ID
 * @param {string} timestamp - ISO timestamp for revisions
 * @param {string} author - Author name for revisions
 * @returns {Object} { paragraph: Paragraph, nextId: number }
 */
function createTrackedParagraph(original, edited, startId, timestamp, author) {
  // Get word-level changes from diff service
  const changes = computeWordDiff(original, edited);
  const textRuns = [];
  let currentId = startId;

  // Convert each change to appropriate TextRun
  for (const change of changes) {
    switch (change.type) {
      case 'equal':
        // Unchanged text - normal formatting
        textRuns.push(new TextRun({ text: change.text }));
        break;

      case 'delete':
        // Deleted text - red strikethrough
        textRuns.push(
          new DeletedTextRun({
            text: change.text,
            id: currentId++,
            author,
            date: timestamp,
          })
        );
        break;

      case 'insert':
        // Inserted text - blue underline
        textRuns.push(
          new InsertedTextRun({
            text: change.text,
            id: currentId++,
            author,
            date: timestamp,
          })
        );
        break;
    }
  }

  return {
    paragraph: new Paragraph({ children: textRuns }),
    nextId: currentId
  };
}

// =============================================================================
// BUFFER GENERATION
// =============================================================================

/**
 * Generate a downloadable .docx buffer from original and edited text.
 *
 * This is the main function called by the API route.
 * Combines document creation and packing into a single async operation.
 *
 * @param {string} originalText - Original manuscript text
 * @param {string} editedText - AI-edited manuscript text
 * @returns {Promise<Buffer>} Binary buffer ready for HTTP response
 */
async function generateDocxBuffer(originalText, editedText) {
  const doc = createDocumentWithTrackChanges(originalText, editedText);
  return await Packer.toBuffer(doc);
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  createDocumentWithTrackChanges,
  createTrackedParagraph,
  generateDocxBuffer
};
