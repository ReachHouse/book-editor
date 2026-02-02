/**
 * Document Service
 * Handles Word document generation with native Track Changes
 */

const { Document, Packer, Paragraph, TextRun, InsertedTextRun, DeletedTextRun } = require('docx');
const { alignParagraphs, computeWordDiff } = require('./diffService');

// ============================================================================
// TRACK CHANGES DOCUMENT CREATION
// ============================================================================

/**
 * Create a Word document with native Track Changes
 * Uses paragraph-level alignment for accurate change tracking
 */
function createDocumentWithTrackChanges(original, edited) {
  // Split into paragraphs, preserving content
  const originalParas = original.split(/\n+/).filter(p => p.trim());
  const editedParas = edited.split(/\n+/).filter(p => p.trim());

  // Align paragraphs using LCS algorithm
  const alignedParagraphs = alignParagraphs(originalParas, editedParas);

  const paragraphs = [];
  let revisionId = 0;
  const timestamp = new Date().toISOString();
  const author = "AI Editor";

  for (const aligned of alignedParagraphs) {
    const result = createParagraphFromAlignment(aligned, revisionId, timestamp, author);
    paragraphs.push(result.paragraph);
    revisionId = result.nextId;
  }

  return new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
}

/**
 * Create a paragraph from an aligned paragraph pair
 */
function createParagraphFromAlignment(aligned, startId, timestamp, author) {
  let currentId = startId;

  switch (aligned.type) {
    case 'match':
      // No changes - just add the text
      return {
        paragraph: new Paragraph({
          children: [new TextRun({ text: aligned.original })]
        }),
        nextId: currentId
      };

    case 'delete':
      // Entire paragraph was deleted
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
      // Paragraph has changes - do word-level diff
      return createTrackedParagraph(aligned.original, aligned.edited, currentId, timestamp, author);

    default:
      // Fallback - treat as unchanged
      return {
        paragraph: new Paragraph({
          children: [new TextRun({ text: aligned.original || aligned.edited || '' })]
        }),
        nextId: currentId
      };
  }
}

/**
 * Create a paragraph with word-level track changes
 */
function createTrackedParagraph(original, edited, startId, timestamp, author) {
  const changes = computeWordDiff(original, edited);
  const textRuns = [];
  let currentId = startId;

  for (const change of changes) {
    switch (change.type) {
      case 'equal':
        textRuns.push(new TextRun({ text: change.text }));
        break;

      case 'delete':
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

/**
 * Generate document buffer from original and edited text
 */
async function generateDocxBuffer(originalText, editedText) {
  const doc = createDocumentWithTrackChanges(originalText, editedText);
  return await Packer.toBuffer(doc);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  createDocumentWithTrackChanges,
  createTrackedParagraph,
  generateDocxBuffer
};
