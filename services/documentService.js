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
 * PROCESSING FLOW:
 * ----------------
 * 1. Split original and edited text into paragraphs
 * 2. Align paragraphs using diffService.alignParagraphs()
 * 3. For each aligned pair:
 *    - 'match': Add as normal TextRun
 *    - 'delete': Add entire paragraph as DeletedTextRun + comment
 *    - 'insert': Add entire paragraph as InsertedTextRun + comment
 *    - 'change': Compute word-level diff, add mixed TextRuns + comments
 * 4. Add summary comment to first paragraph
 * 5. Pack into .docx buffer for download
 *
 * EXPORTS:
 * --------
 * - createDocumentWithTrackChanges: Create Document object from text pair
 * - createTrackedParagraph: Create single paragraph with word-level tracking
 * - generateDocxBuffer: Full pipeline returning downloadable buffer
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

// Minimum word count for a change to get an inline comment
const SIGNIFICANT_CHANGE_THRESHOLD = 3;

// Author name for all comments and revisions
const AUTHOR = "AI Editor";

// =============================================================================
// CHANGE STATISTICS TRACKING
// =============================================================================

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
    paragraphsAdded: 0,
    paragraphsRemoved: 0,
    paragraphsModified: 0,
    wordsInserted: 0,
    wordsDeleted: 0,
    significantChanges: [] // Array of { type, description, wordCount }
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
 * Categorize a change based on its content.
 * Attempts to identify the type of edit (grammar, style, clarity, etc.)
 *
 * @param {string} original - Original text
 * @param {string} edited - Edited text
 * @returns {string} Category description
 */
function categorizeChange(original, edited) {
  if (!original && edited) return "Addition";
  if (original && !edited) return "Removal";

  const origLower = (original || '').toLowerCase();
  const editLower = (edited || '').toLowerCase();

  // Check for punctuation-only changes
  const origNoPunct = origLower.replace(/[^\w\s]/g, '');
  const editNoPunct = editLower.replace(/[^\w\s]/g, '');
  if (origNoPunct === editNoPunct) return "Punctuation";

  // Check for case-only changes
  if (origLower === editLower) return "Capitalization";

  // Check for common grammar patterns
  const grammarPatterns = [
    { pattern: /\b(is|are|was|were|be|been|being)\b/, name: "Verb tense" },
    { pattern: /\b(a|an|the)\b/, name: "Article" },
    { pattern: /\b(who|whom|whose|which|that)\b/, name: "Pronoun/relative clause" },
    { pattern: /\b(very|really|quite|rather)\b/, name: "Intensifier" },
  ];

  for (const { pattern, name } of grammarPatterns) {
    const origMatch = pattern.test(origLower);
    const editMatch = pattern.test(editLower);
    if (origMatch !== editMatch) return name + " adjustment";
  }

  // Check for word replacement (similar length = likely style change)
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

/**
 * Create a summary comment options object for the document.
 * Note: Returns options object, not Comment instance (docx library creates Comment internally)
 *
 * @param {Object} stats - Statistics context
 * @param {string} timestamp - ISO timestamp
 * @returns {Object} Comment options object
 */
function createSummaryComment(stats, timestamp) {
  const lines = [
    "AI EDITOR SUMMARY",
    "═══════════════════════════════",
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
  ];

  // Add significant changes summary if any
  if (stats.significantChanges.length > 0) {
    lines.push("");
    lines.push("NOTABLE EDITS:");
    const changeTypes = {};
    for (const change of stats.significantChanges) {
      changeTypes[change.type] = (changeTypes[change.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(changeTypes)) {
      lines.push(`• ${type}: ${count} occurrence${count > 1 ? 's' : ''}`);
    }
  }

  lines.push("");
  lines.push("Review each change using Word's");
  lines.push("Track Changes feature to accept");
  lines.push("or reject individual edits.");

  // Return options object - docx library creates Comment instance internally
  return {
    id: 0,
    author: AUTHOR,
    date: new Date(timestamp),
    children: lines.map(line => new Paragraph({
      children: [new TextRun({ text: line })]
    }))
  };
}

/**
 * Create an inline comment options object for a significant change.
 * Note: Returns options object, not Comment instance (docx library creates Comment internally)
 *
 * @param {number} id - Comment ID
 * @param {string} changeType - Type of change (delete, insert, change)
 * @param {string} original - Original text (if applicable)
 * @param {string} edited - Edited text (if applicable)
 * @param {string} timestamp - ISO timestamp
 * @returns {Object} Comment options object
 */
function createInlineComment(id, changeType, original, edited, timestamp) {
  const category = categorizeChange(original, edited);
  const lines = [];

  switch (changeType) {
    case 'delete':
      lines.push(`REMOVED: ${category}`);
      lines.push("");
      lines.push("This content was removed to improve");
      lines.push("clarity, flow, or concision.");
      if (original && countWords(original) > 10) {
        lines.push("");
        lines.push(`Removed ${countWords(original)} words.`);
      }
      break;

    case 'insert':
      lines.push(`ADDED: ${category}`);
      lines.push("");
      lines.push("This content was added to enhance");
      lines.push("clarity or provide better flow.");
      if (edited && countWords(edited) > 10) {
        lines.push("");
        lines.push(`Added ${countWords(edited)} words.`);
      }
      break;

    case 'change':
      lines.push(`MODIFIED: ${category}`);
      lines.push("");
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

  // Return options object - docx library creates Comment instance internally
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
// DOCUMENT CREATION
// =============================================================================

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
  // Filter out empty paragraphs
  const originalParas = original.split(/\n+/).filter(p => p.trim());
  const editedParas = edited.split(/\n+/).filter(p => p.trim());

  // Align paragraphs using LCS-based algorithm from diffService
  // This handles added, removed, and reordered paragraphs
  const alignedParagraphs = alignParagraphs(originalParas, editedParas);

  // Initialize tracking context
  const stats = createStatsContext();
  const comments = [];
  const timestamp = new Date().toISOString();

  // Build Word paragraphs from aligned pairs
  // Store both paragraph and children array for later use
  const paragraphData = []; // Array of { paragraph, children }
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
      paragraph: result.paragraph,
      children: result.children
    });
    revisionId = result.nextRevisionId;
    commentId = result.nextCommentId;
  }

  // Build final paragraphs array
  const paragraphs = [];

  // Add summary comment to first paragraph if there are changes
  if (stats.totalInsertions > 0 || stats.totalDeletions > 0) {
    const summaryComment = createSummaryComment(stats, timestamp);
    comments.unshift(summaryComment); // Add at beginning

    // Build paragraphs, wrapping the first one with summary comment markers
    for (let i = 0; i < paragraphData.length; i++) {
      if (i === 0) {
        // Wrap first paragraph with summary comment markers
        const firstChildren = paragraphData[0].children;

        // Ensure we have actual content to wrap
        if (firstChildren && firstChildren.length > 0) {
          paragraphs.push(new Paragraph({
            children: [
              new CommentRangeStart({ id: 0 }),
              ...firstChildren,
              new CommentRangeEnd({ id: 0 }),
              new CommentReference({ id: 0 })
            ]
          }));
        } else {
          // Fallback: create a minimal valid paragraph with placeholder text
          paragraphs.push(new Paragraph({
            children: [
              new CommentRangeStart({ id: 0 }),
              new TextRun({ text: ' ' }),
              new CommentRangeEnd({ id: 0 }),
              new CommentReference({ id: 0 })
            ]
          }));
        }
      } else {
        paragraphs.push(paragraphData[i].paragraph);
      }
    }

    // Handle edge case: no paragraphs but there were changes
    if (paragraphData.length === 0) {
      paragraphs.push(new Paragraph({
        children: [
          new CommentRangeStart({ id: 0 }),
          new TextRun({ text: 'Document edited.' }),
          new CommentRangeEnd({ id: 0 }),
          new CommentReference({ id: 0 })
        ]
      }));
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

// =============================================================================
// PARAGRAPH CREATION
// =============================================================================

/**
 * Create a Word paragraph from an aligned paragraph pair.
 *
 * Handles four alignment types differently:
 * - match: No changes, plain text
 * - delete: Entire paragraph deleted (red strikethrough) + comment
 * - insert: Entire paragraph added (blue underline) + comment
 * - change: Word-level changes within paragraph + comments for significant changes
 *
 * @param {Object} aligned - Aligned paragraph pair from diffService
 * @param {number} startRevisionId - Starting revision ID
 * @param {number} startCommentId - Starting comment ID
 * @param {string} timestamp - ISO timestamp for revisions
 * @param {Object} stats - Statistics tracking context
 * @param {Array} comments - Comments array to add to
 * @returns {Object} { paragraph: Paragraph, children: Array, nextRevisionId: number, nextCommentId: number }
 */
function createParagraphFromAlignment(aligned, startRevisionId, startCommentId, timestamp, stats, comments) {
  let currentRevisionId = startRevisionId;
  let currentCommentId = startCommentId;

  switch (aligned.type) {
    case 'match': {
      // Paragraphs are identical - no Track Changes needed
      const children = [new TextRun({ text: aligned.original })];
      return {
        paragraph: new Paragraph({ children }),
        children,
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
    }

    case 'delete': {
      // Entire paragraph was removed
      stats.totalDeletions++;
      stats.paragraphsRemoved++;
      const wordCount = countWords(aligned.original);
      stats.wordsDeleted += wordCount;

      // Add comment for paragraph deletion
      const comment = createInlineComment(
        currentCommentId,
        'delete',
        aligned.original,
        null,
        timestamp
      );
      comments.push(comment);

      stats.significantChanges.push({
        type: categorizeChange(aligned.original, null),
        description: 'Paragraph removed',
        wordCount
      });

      const children = [
        new CommentRangeStart({ id: currentCommentId }),
        new DeletedTextRun({
          text: aligned.original,
          id: currentRevisionId++,
          author: AUTHOR,
          date: timestamp,
        }),
        new CommentRangeEnd({ id: currentCommentId }),
        new CommentReference({ id: currentCommentId })
      ];
      currentCommentId++;

      return {
        paragraph: new Paragraph({ children }),
        children,
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
    }

    case 'insert': {
      // Entire paragraph is new
      stats.totalInsertions++;
      stats.paragraphsAdded++;
      const wordCount = countWords(aligned.edited);
      stats.wordsInserted += wordCount;

      // Add comment for paragraph insertion
      const comment = createInlineComment(
        currentCommentId,
        'insert',
        null,
        aligned.edited,
        timestamp
      );
      comments.push(comment);

      stats.significantChanges.push({
        type: categorizeChange(null, aligned.edited),
        description: 'Paragraph added',
        wordCount
      });

      const children = [
        new CommentRangeStart({ id: currentCommentId }),
        new InsertedTextRun({
          text: aligned.edited,
          id: currentRevisionId++,
          author: AUTHOR,
          date: timestamp,
        }),
        new CommentRangeEnd({ id: currentCommentId }),
        new CommentReference({ id: currentCommentId })
      ];
      currentCommentId++;

      return {
        paragraph: new Paragraph({ children }),
        children,
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
    }

    case 'change': {
      // Paragraph exists in both but has changes
      stats.paragraphsModified++;
      return createTrackedParagraphWithComments(
        aligned.original,
        aligned.edited,
        currentRevisionId,
        currentCommentId,
        timestamp,
        stats,
        comments
      );
    }

    default: {
      // Fallback - shouldn't happen, but handle gracefully
      const children = [new TextRun({ text: aligned.original || aligned.edited || '' })];
      return {
        paragraph: new Paragraph({ children }),
        children,
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
    }
  }
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

/**
 * Create a paragraph with word-level Track Changes and inline comments.
 *
 * Called when a paragraph has been modified (not added/removed entirely).
 * Uses diffService.computeWordDiff() to find individual word changes,
 * then converts each change to the appropriate TextRun type.
 * Adds comments for significant changes.
 *
 * @param {string} original - Original paragraph text
 * @param {string} edited - Edited paragraph text
 * @param {number} startRevisionId - Starting revision ID
 * @param {number} startCommentId - Starting comment ID
 * @param {string} timestamp - ISO timestamp for revisions
 * @param {Object} stats - Statistics tracking context
 * @param {Array} comments - Comments array to add to
 * @returns {Object} { paragraph: Paragraph, nextRevisionId: number, nextCommentId: number }
 */
function createTrackedParagraphWithComments(original, edited, startRevisionId, startCommentId, timestamp, stats, comments) {
  // Get word-level changes from diff service
  const changes = computeWordDiff(original, edited);
  const textRuns = [];
  let currentRevisionId = startRevisionId;
  let currentCommentId = startCommentId;

  // Track consecutive significant changes to group comments
  let pendingSignificantChange = null;

  // Convert each change to appropriate TextRun
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const wordCount = countWords(change.text);
    const isSignificant = wordCount >= SIGNIFICANT_CHANGE_THRESHOLD;

    switch (change.type) {
      case 'equal':
        // Unchanged text - normal formatting
        textRuns.push(new TextRun({ text: change.text }));
        break;

      case 'delete':
        // Skip whitespace-only deletions
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun({ text: change.text }));
          break;
        }

        stats.totalDeletions++;
        stats.wordsDeleted += wordCount;

        if (isSignificant) {
          // Check if next change is an insert (replacement pattern)
          const nextChange = changes[i + 1];
          const isReplacement = nextChange &&
            nextChange.type === 'insert' &&
            !isWhitespaceOnly(nextChange.text);

          if (isReplacement) {
            // Group delete + insert as a single commented replacement
            const comment = createInlineComment(
              currentCommentId,
              'change',
              change.text,
              nextChange.text,
              timestamp
            );
            comments.push(comment);

            stats.significantChanges.push({
              type: categorizeChange(change.text, nextChange.text),
              description: 'Text replaced',
              wordCount: wordCount + countWords(nextChange.text)
            });

            // Add delete with comment
            textRuns.push(new CommentRangeStart({ id: currentCommentId }));
            textRuns.push(new DeletedTextRun({
              text: change.text,
              id: currentRevisionId++,
              author: AUTHOR,
              date: timestamp,
            }));

            // Add insert (process it now, skip in loop)
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

            i++; // Skip the next insert since we processed it
            break;
          }

          // Standalone significant deletion
          const comment = createInlineComment(
            currentCommentId,
            'delete',
            change.text,
            null,
            timestamp
          );
          comments.push(comment);

          stats.significantChanges.push({
            type: categorizeChange(change.text, null),
            description: 'Text removed',
            wordCount
          });

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
        // Skip whitespace-only insertions
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun({ text: change.text }));
          break;
        }

        stats.totalInsertions++;
        stats.wordsInserted += wordCount;

        if (isSignificant) {
          // Significant standalone insertion
          const comment = createInlineComment(
            currentCommentId,
            'insert',
            null,
            change.text,
            timestamp
          );
          comments.push(comment);

          stats.significantChanges.push({
            type: categorizeChange(null, change.text),
            description: 'Text added',
            wordCount
          });

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
          // Non-significant insertion - no comment
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
    children: textRuns,
    nextRevisionId: currentRevisionId,
    nextCommentId: currentCommentId
  };
}

// Keep the old function signature for backwards compatibility
function createTrackedParagraph(original, edited, startId, timestamp, author) {
  const stats = createStatsContext();
  const comments = [];
  const result = createTrackedParagraphWithComments(
    original,
    edited,
    startId,
    1,
    timestamp,
    stats,
    comments
  );
  return {
    paragraph: result.paragraph,
    nextId: result.nextRevisionId
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
