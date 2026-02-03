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
const { STYLE_RULES, detectStyleViolations } = require('./styleRules');

// =============================================================================
// CONSTANTS
// =============================================================================

// Minimum word count for a change to get an inline comment
const SIGNIFICANT_CHANGE_THRESHOLD = 3;

// Author name for all comments and revisions
const AUTHOR = "AI Editor";

// TEMPORARY: Set to true to disable all comments for debugging
// If document opens cleanly with this true, comments are the issue
const DISABLE_COMMENTS = false;

// Inline comments on track changes - testing with single-paragraph content
const DISABLE_INLINE_COMMENTS = false;

// Per Reach Publishers style guide: highlight changes in red for visibility
// This adds red highlighting to insertions AND tracks it as a formatting revision
const HIGHLIGHT_INSERTIONS = true;
const INSERTION_HIGHLIGHT_COLOR = "yellow"; // docx highlight colors: yellow, green, cyan, magenta, blue, red, darkBlue, darkCyan, darkGreen, darkMagenta, darkRed, darkYellow, gray, lightGray, black

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
    totalFormattingChanges: 0, // Track formatting revisions (red highlighting)
    paragraphsAdded: 0,
    paragraphsRemoved: 0,
    paragraphsModified: 0,
    wordsInserted: 0,
    wordsDeleted: 0,
    significantChanges: [], // Array of { type, description, wordCount }
    styleRulesApplied: new Set() // Track which style guide rules were triggered
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
 * First checks for specific style guide rule violations,
 * then falls back to generic categorization.
 *
 * @param {string} original - Original text
 * @param {string} edited - Edited text
 * @returns {Object} { category, rule, explanation, isStyleRule, ruleId }
 */
function categorizeChange(original, edited) {
  // Handle basic cases
  if (!original && edited) {
    return { category: "Addition", rule: null, explanation: "New content added.", isStyleRule: false, ruleId: null };
  }
  if (original && !edited) {
    return { category: "Removal", rule: null, explanation: "Content removed for clarity or concision.", isStyleRule: false, ruleId: null };
  }

  // Check for style guide rule violations first
  for (const rule of STYLE_RULES) {
    try {
      if (rule.detect(original, edited)) {
        return {
          category: rule.name,
          rule: rule.rule,
          explanation: rule.explanation,
          isStyleRule: true,
          ruleId: rule.id
        };
      }
    } catch (error) {
      // Skip rule if detection fails
    }
  }

  // Fall back to generic categorization
  const origLower = (original || '').toLowerCase();
  const editLower = (edited || '').toLowerCase();

  // Check for punctuation-only changes
  const origNoPunct = origLower.replace(/[^\w\s]/g, '');
  const editNoPunct = editLower.replace(/[^\w\s]/g, '');
  if (origNoPunct === editNoPunct) {
    return { category: "Punctuation", rule: null, explanation: "Punctuation adjusted for clarity.", isStyleRule: false, ruleId: null };
  }

  // Check for case-only changes
  if (origLower === editLower) {
    return { category: "Capitalization", rule: null, explanation: "Capitalization corrected.", isStyleRule: false, ruleId: null };
  }

  // Check for common grammar patterns
  const grammarPatterns = [
    { pattern: /\b(is|are|was|were|be|been|being)\b/, name: "Verb tense", explanation: "Verb tense adjusted for consistency." },
    { pattern: /\b(a|an|the)\b/, name: "Article", explanation: "Article usage corrected." },
    { pattern: /\b(who|whom|whose|which|that)\b/, name: "Pronoun/relative clause", explanation: "Relative pronoun corrected for proper reference." },
    { pattern: /\b(very|really|quite|rather)\b/, name: "Intensifier", explanation: "Intensifier removed or modified for stronger prose." },
  ];

  for (const { pattern, name, explanation } of grammarPatterns) {
    const origMatch = pattern.test(origLower);
    const editMatch = pattern.test(editLower);
    if (origMatch !== editMatch) {
      return { category: name + " adjustment", rule: null, explanation, isStyleRule: false, ruleId: null };
    }
  }

  // Check for word replacement (similar length = likely style change)
  const origWords = countWords(original);
  const editWords = countWords(edited);
  const wordDiff = Math.abs(origWords - editWords);

  if (wordDiff === 0) {
    return { category: "Word choice", rule: null, explanation: "Word choice refined for clarity or style.", isStyleRule: false, ruleId: null };
  }
  if (wordDiff <= 2) {
    return { category: "Clarity improvement", rule: null, explanation: "Phrasing adjusted for better clarity.", isStyleRule: false, ruleId: null };
  }
  if (editWords > origWords) {
    return { category: "Expansion for clarity", rule: null, explanation: "Text expanded to improve understanding.", isStyleRule: false, ruleId: null };
  }
  if (editWords < origWords) {
    return { category: "Concision improvement", rule: null, explanation: "Text condensed for tighter prose.", isStyleRule: false, ruleId: null };
  }

  return { category: "Style refinement", rule: null, explanation: "Style adjusted per house guidelines.", isStyleRule: false, ruleId: null };
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
    "-------------------------------",
    "",
    `Edited: ${new Date(timestamp).toLocaleString()}`,
    "",
    "CHANGE STATISTICS:",
    `- Total revisions: ${stats.totalInsertions + stats.totalDeletions}`,
    `- Insertions: ${stats.totalInsertions}`,
    `- Deletions: ${stats.totalDeletions}`,
    `- Formatting: ${stats.totalFormattingChanges}`,
    "",
    "PARAGRAPH CHANGES:",
    `- Paragraphs added: ${stats.paragraphsAdded}`,
    `- Paragraphs removed: ${stats.paragraphsRemoved}`,
    `- Paragraphs modified: ${stats.paragraphsModified}`,
    "",
    "WORD-LEVEL CHANGES:",
    `- Words inserted: ${stats.wordsInserted}`,
    `- Words deleted: ${stats.wordsDeleted}`,
  ];

  // Add style rules applied section if any
  if (stats.styleRulesApplied && stats.styleRulesApplied.size > 0) {
    lines.push("");
    lines.push("STYLE RULES APPLIED:");
    for (const ruleId of stats.styleRulesApplied) {
      const rule = STYLE_RULES.find(r => r.id === ruleId);
      if (rule) {
        lines.push(`- ${rule.name}`);
      }
    }
  }

  // Add significant changes summary if any
  if (stats.significantChanges.length > 0) {
    lines.push("");
    lines.push("NOTABLE EDITS:");
    const changeTypes = {};
    for (const change of stats.significantChanges) {
      changeTypes[change.type] = (changeTypes[change.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(changeTypes)) {
      lines.push(`- ${type}: ${count} occurrence${count > 1 ? 's' : ''}`);
    }
  }

  lines.push("");
  lines.push("Review each change using Word's");
  lines.push("Track Changes feature to accept");
  lines.push("or reject individual edits.");

  // Build comment content - v9.x: use exact syntax from official demo
  // Demo uses: new TextRun({ text: "..." }) - NOT the shorthand new TextRun("...")
  const paragraphs = lines.map(line =>
    new Paragraph({
      children: [
        new TextRun({
          text: line || " "
        })
      ]
    })
  );

  return {
    id: 0,
    author: AUTHOR,
    date: new Date(timestamp),
    children: paragraphs
  };
}

/**
 * Create an inline comment for a significant change.
 * Enhanced to show before/after text and style rule references.
 *
 * @param {number} id - Comment ID
 * @param {string} changeType - Type of change (delete, insert, change)
 * @param {string} original - Original text (if applicable)
 * @param {string} edited - Edited text (if applicable)
 * @param {string} timestamp - ISO timestamp
 * @returns {Object} Comment options object
 */
function createInlineComment(id, changeType, original, edited, timestamp) {
  const categoryInfo = categorizeChange(original, edited);
  const lines = [];

  // Helper to truncate long text for display
  const truncate = (text, maxLen = 50) => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  switch (changeType) {
    case 'delete':
      lines.push(`REMOVED: ${categoryInfo.category}`);
      lines.push("");
      lines.push(categoryInfo.explanation);
      if (original && countWords(original) > 3) {
        lines.push("");
        lines.push(`Text removed (${countWords(original)} words):`);
        lines.push(`"${truncate(original, 80)}"`);
      }
      break;

    case 'insert':
      lines.push(`ADDED: ${categoryInfo.category}`);
      lines.push("");
      lines.push(categoryInfo.explanation);
      if (edited && countWords(edited) > 3) {
        lines.push("");
        lines.push(`Text added (${countWords(edited)} words):`);
        lines.push(`"${truncate(edited, 80)}"`);
      }
      break;

    case 'change':
      lines.push(`MODIFIED: ${categoryInfo.category}`);
      lines.push("");
      lines.push(categoryInfo.explanation);
      lines.push("");
      // Show before/after for modifications
      if (original && edited) {
        lines.push("BEFORE:");
        lines.push(`"${truncate(original, 60)}"`);
        lines.push("");
        lines.push("AFTER:");
        lines.push(`"${truncate(edited, 60)}"`);
      }
      break;

    default:
      lines.push("Edit made for improvement.");
  }

  // Add style guide reference for style rule violations
  if (categoryInfo.isStyleRule && categoryInfo.rule) {
    lines.push("");
    lines.push("---");
    lines.push("STYLE GUIDE:");
    lines.push(categoryInfo.rule);
  }

  // Build comment content - v9.x: use exact syntax from official demo
  // Demo uses: new TextRun({ text: "..." }) - NOT the shorthand new TextRun("...")
  const paragraphs = lines.map(line =>
    new Paragraph({
      children: [
        new TextRun({
          text: line || " "
        })
      ]
    })
  );

  return {
    id,
    author: AUTHOR,
    date: new Date(timestamp),
    children: paragraphs
  };
}

/**
 * Create a highlighted InsertedTextRun for visibility.
 * Combines track change (InsertedTextRun) with formatting revision (highlight).
 * This makes the insertion appear in Word's Formatting count as well as Insertions.
 *
 * The `revision` property tracks formatting changes (rPrChange in OOXML).
 * It records the OLD state before the change, so an empty revision means
 * "previously had no special formatting" → now has highlight.
 *
 * @param {string} text - The inserted text
 * @param {number} revisionId - Revision ID for the insertion
 * @param {Date} dateObj - Date object for the revision
 * @returns {InsertedTextRun} InsertedTextRun with highlight and formatting revision tracked
 */
function createHighlightedInsertedRun(text, revisionId, dateObj) {
  if (!HIGHLIGHT_INSERTIONS) {
    // Return standard InsertedTextRun without highlighting
    return new InsertedTextRun({
      text: text,
      id: revisionId,
      author: AUTHOR,
      date: dateObj,
    });
  }

  // Return InsertedTextRun with highlight AND formatting revision tracking
  // The revision property creates rPrChange element in OOXML which tracks formatting changes
  // This makes Word show the change in both Insertions AND Formatting counts
  return new InsertedTextRun({
    text: text,
    id: revisionId,
    author: AUTHOR,
    date: dateObj,
    highlight: INSERTION_HIGHLIGHT_COLOR,
    // Track the highlight as a formatting revision
    // Empty revision = "no formatting before" → Word sees this as adding highlight
    revision: {
      id: revisionId + 1000, // Use offset to avoid ID collision with insertion
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
  // Pattern to match *italic text* (non-greedy)
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
    // No italics - return single run using existing function
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
      id: revisionId + 1000,
      author: AUTHOR,
      date: dateObj,
    };
  }

  return new InsertedTextRun(options);
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
  // IMPORTANT: We must NOT wrap content paragraphs with summary comment markers
  // because content paragraphs may already have inline comment markers, and
  // nested comment ranges violate OOXML spec (causes "unreadable content" in Word)
  if (stats.totalInsertions > 0 || stats.totalDeletions > 0) {
    const summaryComment = createSummaryComment(stats, timestamp);
    comments.unshift(summaryComment); // Add at beginning

    // Create a dedicated summary paragraph with its own comment markers (no nesting)
    // v9.5.1: CommentReference is a ParagraphChild, NOT a TextRun child (per type definitions)
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

    // Add paragraph with space for visual separation (empty children array can cause issues)
    paragraphs.push(new Paragraph({
      children: [new TextRun(" ")]
    }));

    // Add ALL content paragraphs as-is (no wrapping - avoids nested comments)
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
      const children = [new TextRun(aligned.original)];
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

      const deleteCategory = categorizeChange(aligned.original, null);
      if (deleteCategory.ruleId) {
        stats.styleRulesApplied.add(deleteCategory.ruleId);
      }
      stats.significantChanges.push({
        type: deleteCategory.category,
        description: 'Paragraph removed',
        wordCount
      });

      const dateObj = new Date(timestamp);
      let children;

      if (DISABLE_COMMENTS || DISABLE_INLINE_COMMENTS) {
        // No comment markers when disabled
        children = [
          new DeletedTextRun({
            text: aligned.original,
            id: currentRevisionId++,
            author: AUTHOR,
            date: dateObj,
          })
        ];
      } else {
        // Add comment for paragraph deletion
        const comment = createInlineComment(
          currentCommentId,
          'delete',
          aligned.original,
          null,
          timestamp
        );
        comments.push(comment);

        // IMPORTANT: Comment markers must NOT wrap track change elements (causes OOXML error)
        // Instead, put comment on an anchor character AFTER the track change
        // v9.5.1: CommentReference is a ParagraphChild (direct child of Paragraph, NOT wrapped in TextRun)
        children = [
          new DeletedTextRun({
            text: aligned.original,
            id: currentRevisionId++,
            author: AUTHOR,
            date: dateObj,
          }),
          new CommentRangeStart(currentCommentId),
          new TextRun(" "),
          new CommentRangeEnd(currentCommentId),
          new CommentReference(currentCommentId)
        ];
        currentCommentId++;
      }

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

      const insertCategory = categorizeChange(null, aligned.edited);
      if (insertCategory.ruleId) {
        stats.styleRulesApplied.add(insertCategory.ruleId);
      }
      stats.significantChanges.push({
        type: insertCategory.category,
        description: 'Paragraph added',
        wordCount
      });

      const dateObj = new Date(timestamp);
      let children;

      if (DISABLE_COMMENTS || DISABLE_INLINE_COMMENTS) {
        // No comment markers when disabled
        // Use italics-aware version to properly render *italic* markers
        const insertResult = createHighlightedInsertedRuns(aligned.edited, currentRevisionId, dateObj);
        children = insertResult.runs;
        currentRevisionId = insertResult.nextRevisionId;
        if (HIGHLIGHT_INSERTIONS) stats.totalFormattingChanges++;
      } else {
        // Add comment for paragraph insertion
        const comment = createInlineComment(
          currentCommentId,
          'insert',
          null,
          aligned.edited,
          timestamp
        );
        comments.push(comment);

        // IMPORTANT: Comment markers must NOT wrap track change elements (causes OOXML error)
        // Instead, put comment on an anchor character AFTER the track change
        // v9.5.1: CommentReference is a ParagraphChild (direct child of Paragraph, NOT wrapped in TextRun)
        // Use italics-aware version to properly render *italic* markers
        const insertResult = createHighlightedInsertedRuns(aligned.edited, currentRevisionId, dateObj);
        children = [
          ...insertResult.runs,
          new CommentRangeStart(currentCommentId),
          new TextRun(" "),
          new CommentRangeEnd(currentCommentId),
          new CommentReference(currentCommentId)
        ];
        currentRevisionId = insertResult.nextRevisionId;
        if (HIGHLIGHT_INSERTIONS) stats.totalFormattingChanges++;
        currentCommentId++;
      }

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
      const children = [new TextRun(aligned.original || aligned.edited || '')];
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
  const dateObj = new Date(timestamp);

  // Convert each change to appropriate TextRun
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const wordCount = countWords(change.text);
    const isSignificant = wordCount >= SIGNIFICANT_CHANGE_THRESHOLD;

    switch (change.type) {
      case 'equal':
        // Unchanged text - normal formatting
        textRuns.push(new TextRun(change.text));
        break;

      case 'delete':
        // Skip whitespace-only deletions
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun(change.text));
          break;
        }

        stats.totalDeletions++;
        stats.wordsDeleted += wordCount;

        if (isSignificant && !DISABLE_COMMENTS && !DISABLE_INLINE_COMMENTS) {
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

            const replaceCategory = categorizeChange(change.text, nextChange.text);
            if (replaceCategory.ruleId) {
              stats.styleRulesApplied.add(replaceCategory.ruleId);
            }
            stats.significantChanges.push({
              type: replaceCategory.category,
              description: 'Text replaced',
              wordCount: wordCount + countWords(nextChange.text)
            });

            // Add track changes first, then comment anchor AFTER (not wrapping)
            textRuns.push(new DeletedTextRun({
              text: change.text,
              id: currentRevisionId++,
              author: AUTHOR,
              date: dateObj,
            }));

            // Add insert (process it now, skip in loop)
            // Use italics-aware version to properly render *italic* markers
            stats.totalInsertions++;
            stats.wordsInserted += countWords(nextChange.text);
            const replaceInsertResult = createHighlightedInsertedRuns(nextChange.text, currentRevisionId, dateObj);
            textRuns.push(...replaceInsertResult.runs);
            currentRevisionId = replaceInsertResult.nextRevisionId;
            if (HIGHLIGHT_INSERTIONS) stats.totalFormattingChanges++;

            // Comment anchor AFTER the track changes (not wrapping them)
            // v9.5.1: CommentReference is a ParagraphChild (direct child of Paragraph, NOT wrapped in TextRun)
            textRuns.push(new CommentRangeStart(currentCommentId));
            textRuns.push(new TextRun(" "));
            textRuns.push(new CommentRangeEnd(currentCommentId));
            textRuns.push(new CommentReference(currentCommentId));
            currentCommentId++;

            i++; // Skip the next insert since we processed it
            break;
          }

          // Standalone significant deletion with comment
          const comment = createInlineComment(
            currentCommentId,
            'delete',
            change.text,
            null,
            timestamp
          );
          comments.push(comment);

          const delCategory = categorizeChange(change.text, null);
          if (delCategory.ruleId) {
            stats.styleRulesApplied.add(delCategory.ruleId);
          }
          stats.significantChanges.push({
            type: delCategory.category,
            description: 'Text removed',
            wordCount
          });

          // Track change first, then comment anchor AFTER (not wrapping)
          // v9.5.1: CommentReference is a ParagraphChild (direct child of Paragraph, NOT wrapped in TextRun)
          textRuns.push(new DeletedTextRun({
            text: change.text,
            id: currentRevisionId++,
            author: AUTHOR,
            date: dateObj,
          }));
          textRuns.push(new CommentRangeStart(currentCommentId));
          textRuns.push(new TextRun(" "));
          textRuns.push(new CommentRangeEnd(currentCommentId));
          textRuns.push(new CommentReference(currentCommentId));
          currentCommentId++;
        } else {
          // No comment - just track change
          textRuns.push(new DeletedTextRun({
            text: change.text,
            id: currentRevisionId++,
            author: AUTHOR,
            date: dateObj,
          }));
        }
        break;

      case 'insert':
        // Skip whitespace-only insertions
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun(change.text));
          break;
        }

        stats.totalInsertions++;
        stats.wordsInserted += wordCount;

        if (isSignificant && !DISABLE_COMMENTS && !DISABLE_INLINE_COMMENTS) {
          // Significant standalone insertion with comment
          const comment = createInlineComment(
            currentCommentId,
            'insert',
            null,
            change.text,
            timestamp
          );
          comments.push(comment);

          const addCategory = categorizeChange(null, change.text);
          if (addCategory.ruleId) {
            stats.styleRulesApplied.add(addCategory.ruleId);
          }
          stats.significantChanges.push({
            type: addCategory.category,
            description: 'Text added',
            wordCount
          });

          // Track change first, then comment anchor AFTER (not wrapping)
          // v9.5.1: CommentReference is a ParagraphChild (direct child of Paragraph, NOT wrapped in TextRun)
          // Use italics-aware version to properly render *italic* markers
          const sigInsertResult = createHighlightedInsertedRuns(change.text, currentRevisionId, dateObj);
          textRuns.push(...sigInsertResult.runs);
          currentRevisionId = sigInsertResult.nextRevisionId;
          if (HIGHLIGHT_INSERTIONS) stats.totalFormattingChanges++;
          textRuns.push(new CommentRangeStart(currentCommentId));
          textRuns.push(new TextRun(" "));
          textRuns.push(new CommentRangeEnd(currentCommentId));
          textRuns.push(new CommentReference(currentCommentId));
          currentCommentId++;
        } else {
          // No comment - just track change
          // Use italics-aware version to properly render *italic* markers
          const insertResult = createHighlightedInsertedRuns(change.text, currentRevisionId, dateObj);
          textRuns.push(...insertResult.runs);
          currentRevisionId = insertResult.nextRevisionId;
          if (HIGHLIGHT_INSERTIONS) stats.totalFormattingChanges++;
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
