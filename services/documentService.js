/**
 * =============================================================================
 * DOCUMENT SERVICE - Word Document Generation with Track Changes & Comments
 * =============================================================================
 *
 * This service generates Microsoft Word (.docx) documents with native
 * Track Changes support AND review comments. When opened in Word, users can
 * accept/reject individual changes and view AI explanations in comments.
 *
 * TRACK CHANGES IMPLEMENTATION:
 * -----------------------------
 * Uses the 'docx' npm library which provides:
 * - InsertedTextRun: Blue underlined text (additions)
 * - DeletedTextRun: Red strikethrough text (deletions)
 * - TextRun: Normal unchanged text
 *
 * COMMENT IMPLEMENTATION:
 * -----------------------
 * Uses the 'docx' npm library comment support:
 * - Comment: The comment content shown in Word's comment panel
 * - CommentRangeStart/End: Marks the text being commented on
 * - CommentReference: The reference marker in the text
 *
 * Comment types added:
 * 1. Summary Comment: Overview of all changes at document start
 * 2. Inline Comments: Explanations for significant changes
 *
 * =============================================================================
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  InsertedTextRun,
  DeletedTextRun,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference
} = require('docx');
const { alignParagraphs, computeWordDiff } = require('./diffService');

// =============================================================================
// CONSTANTS
// =============================================================================

const SIGNIFICANT_CHANGE_THRESHOLD = 3;
const AUTHOR = "AI Editor";

// =============================================================================
// STATISTICS TRACKING
// =============================================================================

function createStatsContext() {
  return {
    totalInsertions: 0,
    totalDeletions: 0,
    paragraphsAdded: 0,
    paragraphsRemoved: 0,
    paragraphsModified: 0,
    wordsInserted: 0,
    wordsDeleted: 0,
    significantChanges: []
  };
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function categorizeChange(original, edited) {
  if (!original && edited) return "Addition";
  if (original && !edited) return "Removal";

  const origLower = (original || '').toLowerCase();
  const editLower = (edited || '').toLowerCase();

  const origNoPunct = origLower.replace(/[^\w\s]/g, '');
  const editNoPunct = editLower.replace(/[^\w\s]/g, '');
  if (origNoPunct === editNoPunct) return "Punctuation";
  if (origLower === editLower) return "Capitalization";

  const origWords = countWords(original);
  const editWords = countWords(edited);
  const wordDiff = Math.abs(origWords - editWords);

  if (wordDiff === 0) return "Word choice";
  if (wordDiff <= 2) return "Clarity improvement";
  if (editWords > origWords) return "Expansion for clarity";
  if (editWords < origWords) return "Concision improvement";

  return "Style refinement";
}

// =============================================================================
// COMMENT CREATION
// =============================================================================

function createSummaryComment(stats, timestamp) {
  const lines = [
    "AI EDITOR SUMMARY",
    "",
    `Edited: ${new Date(timestamp).toLocaleString()}`,
    "",
    "CHANGE STATISTICS:",
    `• Total revisions: ${stats.totalInsertions + stats.totalDeletions}`,
    `• Insertions: ${stats.totalInsertions}`,
    `• Deletions: ${stats.totalDeletions}`,
    "",
    "PARAGRAPH CHANGES:",
    `• Paragraphs added: ${stats.paragraphsAdded}`,
    `• Paragraphs removed: ${stats.paragraphsRemoved}`,
    `• Paragraphs modified: ${stats.paragraphsModified}`,
    "",
    "WORD-LEVEL CHANGES:",
    `• Words inserted: ${stats.wordsInserted}`,
    `• Words deleted: ${stats.wordsDeleted}`,
    "",
    "Review each change using Word's",
    "Track Changes feature to accept",
    "or reject individual edits."
  ];

  return {
    id: 0,
    author: AUTHOR,
    date: new Date(timestamp),
    children: lines.map(line => new Paragraph({
      children: [new TextRun({ text: line })]
    }))
  };
}

function createInlineComment(id, changeType, original, edited, timestamp) {
  const category = categorizeChange(original, edited);
  const lines = [];

  switch (changeType) {
    case 'delete':
      lines.push(`REMOVED: ${category}`);
      lines.push("This content was removed to improve clarity, flow, or concision.");
      break;
    case 'insert':
      lines.push(`ADDED: ${category}`);
      lines.push("This content was added to enhance clarity or provide better flow.");
      break;
    case 'change':
      lines.push(`MODIFIED: ${category}`);
      const origWords = countWords(original);
      const editWords = countWords(edited);
      if (origWords !== editWords) {
        lines.push(`Changed from ${origWords} to ${editWords} words.`);
      } else {
        lines.push("Word choice or phrasing refined.");
      }
      break;
    default:
      lines.push("Edit made for improvement.");
  }

  return {
    id,
    author: AUTHOR,
    date: new Date(timestamp),
    children: lines.map(line => new Paragraph({
      children: [new TextRun({ text: line })]
    }))
  };
}

// =============================================================================
// DOCUMENT CREATION - FIXED IMPLEMENTATION
// =============================================================================

function createDocumentWithTrackChanges(original, edited) {
  const originalParas = original.split(/\n+/).filter(p => p.trim());
  const editedParas = edited.split(/\n+/).filter(p => p.trim());
  const alignedParagraphs = alignParagraphs(originalParas, editedParas);

  const stats = createStatsContext();
  const comments = [];
  const timestamp = new Date().toISOString();

  // Build content paragraphs
  const paragraphs = [];
  let revisionId = 0;
  let commentId = 1; // Reserve 0 for summary comment

  for (const aligned of alignedParagraphs) {
    const result = createParagraphFromAlignment(
      aligned, revisionId, commentId, timestamp, stats, comments
    );
    paragraphs.push(result.paragraph);
    revisionId = result.nextRevisionId;
    commentId = result.nextCommentId;
  }

  // Add summary comment if there were changes
  // Use a dedicated summary paragraph instead of wrapping first content paragraph
  if (stats.totalInsertions > 0 || stats.totalDeletions > 0) {
    const summaryComment = createSummaryComment(stats, timestamp);
    comments.unshift(summaryComment);

    // Add a summary paragraph at the beginning with the comment reference
    const summaryParagraph = new Paragraph({
      children: [
        new CommentRangeStart({ id: 0 }),
        new TextRun({
          text: "AI EDITOR SUMMARY",
          bold: true
        }),
        new CommentRangeEnd({ id: 0 }),
        new CommentReference({ id: 0 })
      ]
    });
    paragraphs.unshift(summaryParagraph);
  }

  // Create Document with all features enabled
  return new Document({
    features: {
      trackRevisions: true
    },
    comments: {
      children: comments
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240,  // 8.5 inches in twips (Letter size)
            height: 15840  // 11 inches in twips
          },
          margin: {
            top: 1440,     // 1 inch in twips
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: paragraphs
    }]
  });
}

// =============================================================================
// PARAGRAPH CREATION
// =============================================================================

function createParagraphFromAlignment(aligned, startRevisionId, startCommentId, timestamp, stats, comments) {
  let currentRevisionId = startRevisionId;
  let currentCommentId = startCommentId;

  switch (aligned.type) {
    case 'match':
      return {
        paragraph: new Paragraph({
          children: [new TextRun({ text: aligned.original })]
        }),
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };

    case 'delete': {
      stats.totalDeletions++;
      stats.paragraphsRemoved++;
      const wordCount = countWords(aligned.original);
      stats.wordsDeleted += wordCount;

      // Create comment for this deletion
      const comment = createInlineComment(currentCommentId, 'delete', aligned.original, null, timestamp);
      comments.push(comment);

      const paragraph = new Paragraph({
        children: [
          new CommentRangeStart({ id: currentCommentId }),
          new DeletedTextRun({
            text: aligned.original,
            id: currentRevisionId++,
            author: AUTHOR,
            date: timestamp,
          }),
          new CommentRangeEnd({ id: currentCommentId }),
          new CommentReference({ id: currentCommentId })
        ]
      });
      currentCommentId++;

      return {
        paragraph,
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
    }

    case 'insert': {
      stats.totalInsertions++;
      stats.paragraphsAdded++;
      const wordCount = countWords(aligned.edited);
      stats.wordsInserted += wordCount;

      // Create comment for this insertion
      const comment = createInlineComment(currentCommentId, 'insert', null, aligned.edited, timestamp);
      comments.push(comment);

      const paragraph = new Paragraph({
        children: [
          new CommentRangeStart({ id: currentCommentId }),
          new InsertedTextRun({
            text: aligned.edited,
            id: currentRevisionId++,
            author: AUTHOR,
            date: timestamp,
          }),
          new CommentRangeEnd({ id: currentCommentId }),
          new CommentReference({ id: currentCommentId })
        ]
      });
      currentCommentId++;

      return {
        paragraph,
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
    }

    case 'change': {
      stats.paragraphsModified++;
      return createTrackedParagraphWithComments(
        aligned.original, aligned.edited,
        currentRevisionId, currentCommentId,
        timestamp, stats, comments
      );
    }

    default:
      return {
        paragraph: new Paragraph({
          children: [new TextRun({ text: aligned.original || aligned.edited || '' })]
        }),
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
  }
}

function isWhitespaceOnly(text) {
  return !text || text.trim().length === 0;
}

function createTrackedParagraphWithComments(original, edited, startRevisionId, startCommentId, timestamp, stats, comments) {
  const changes = computeWordDiff(original, edited);
  const textRuns = [];
  let currentRevisionId = startRevisionId;
  let currentCommentId = startCommentId;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const wordCount = countWords(change.text);
    const isSignificant = wordCount >= SIGNIFICANT_CHANGE_THRESHOLD;

    switch (change.type) {
      case 'equal':
        textRuns.push(new TextRun({ text: change.text }));
        break;

      case 'delete':
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun({ text: change.text }));
          break;
        }

        stats.totalDeletions++;
        stats.wordsDeleted += wordCount;

        if (isSignificant) {
          // Check for replacement pattern (delete followed by insert)
          const nextChange = changes[i + 1];
          const isReplacement = nextChange && nextChange.type === 'insert' && !isWhitespaceOnly(nextChange.text);

          if (isReplacement) {
            // Group delete + insert as a replacement with one comment
            const comment = createInlineComment(currentCommentId, 'change', change.text, nextChange.text, timestamp);
            comments.push(comment);

            textRuns.push(new CommentRangeStart({ id: currentCommentId }));
            textRuns.push(new DeletedTextRun({
              text: change.text,
              id: currentRevisionId++,
              author: AUTHOR,
              date: timestamp,
            }));

            stats.totalInsertions++;
            stats.wordsInserted += countWords(nextChange.text);
            textRuns.push(new InsertedTextRun({
              text: nextChange.text,
              id: currentRevisionId++,
              author: AUTHOR,
              date: timestamp,
            }));
            textRuns.push(new CommentRangeEnd({ id: currentCommentId }));
            textRuns.push(new CommentReference({ id: currentCommentId }));
            currentCommentId++;

            i++; // Skip the next insert
            break;
          }

          // Standalone deletion with comment
          const comment = createInlineComment(currentCommentId, 'delete', change.text, null, timestamp);
          comments.push(comment);

          textRuns.push(new CommentRangeStart({ id: currentCommentId }));
          textRuns.push(new DeletedTextRun({
            text: change.text,
            id: currentRevisionId++,
            author: AUTHOR,
            date: timestamp,
          }));
          textRuns.push(new CommentRangeEnd({ id: currentCommentId }));
          textRuns.push(new CommentReference({ id: currentCommentId }));
          currentCommentId++;
        } else {
          // Non-significant deletion - no comment
          textRuns.push(new DeletedTextRun({
            text: change.text,
            id: currentRevisionId++,
            author: AUTHOR,
            date: timestamp,
          }));
        }
        break;

      case 'insert':
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun({ text: change.text }));
          break;
        }

        stats.totalInsertions++;
        stats.wordsInserted += wordCount;

        if (isSignificant) {
          const comment = createInlineComment(currentCommentId, 'insert', null, change.text, timestamp);
          comments.push(comment);

          textRuns.push(new CommentRangeStart({ id: currentCommentId }));
          textRuns.push(new InsertedTextRun({
            text: change.text,
            id: currentRevisionId++,
            author: AUTHOR,
            date: timestamp,
          }));
          textRuns.push(new CommentRangeEnd({ id: currentCommentId }));
          textRuns.push(new CommentReference({ id: currentCommentId }));
          currentCommentId++;
        } else {
          textRuns.push(new InsertedTextRun({
            text: change.text,
            id: currentRevisionId++,
            author: AUTHOR,
            date: timestamp,
          }));
        }
        break;
    }
  }

  return {
    paragraph: new Paragraph({ children: textRuns }),
    nextRevisionId: currentRevisionId,
    nextCommentId: currentCommentId
  };
}

// Backwards compatibility
function createTrackedParagraph(original, edited, startId, timestamp) {
  const stats = createStatsContext();
  const comments = [];
  const result = createTrackedParagraphWithComments(original, edited, startId, 1, timestamp, stats, comments);
  return {
    paragraph: result.paragraph,
    nextId: result.nextRevisionId
  };
}

// =============================================================================
// BUFFER GENERATION
// =============================================================================

async function generateDocxBuffer(originalText, editedText) {
  const doc = createDocumentWithTrackChanges(originalText, editedText);
  return await Packer.toBuffer(doc);
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  createDocumentWithTrackChanges,
  createTrackedParagraph,
  generateDocxBuffer
};
