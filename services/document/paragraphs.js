/**
 * =============================================================================
 * PARAGRAPH CREATION
 * =============================================================================
 *
 * Functions for creating Word paragraphs with Track Changes.
 * Handles paragraph-level and word-level change tracking.
 *
 * =============================================================================
 */

const {
  Paragraph,
  TextRun,
  DeletedTextRun,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference
} = require('docx');
const { computeWordDiff } = require('../diffService');
const {
  AUTHOR,
  SIGNIFICANT_CHANGE_THRESHOLD,
  DISABLE_COMMENTS,
  DISABLE_INLINE_COMMENTS,
  HIGHLIGHT_INSERTIONS
} = require('./constants');
const { countWords, isWhitespaceOnly } = require('./utils');
const { categorizeChange } = require('./categorization');
const { createInlineComment } = require('./comments');
const { createHighlightedInsertedRuns } = require('./formatting');

/**
 * Create a Word paragraph from an aligned paragraph pair.
 *
 * Handles four alignment types:
 * - match: No changes, plain text
 * - delete: Entire paragraph deleted (red strikethrough)
 * - insert: Entire paragraph added (blue underline)
 * - change: Word-level changes within paragraph
 *
 * @param {Object} aligned - Aligned paragraph pair from diffService
 * @param {number} startRevisionId - Starting revision ID
 * @param {number} startCommentId - Starting comment ID
 * @param {string} timestamp - ISO timestamp for revisions
 * @param {Object} stats - Statistics tracking context
 * @param {Array} comments - Comments array to add to
 * @returns {Object} { paragraph, children, nextRevisionId, nextCommentId }
 */
function createParagraphFromAlignment(aligned, startRevisionId, startCommentId, timestamp, stats, comments) {
  let currentRevisionId = startRevisionId;
  let currentCommentId = startCommentId;

  switch (aligned.type) {
    case 'match': {
      const children = [new TextRun(aligned.original)];
      return {
        paragraph: new Paragraph({ children }),
        children,
        nextRevisionId: currentRevisionId,
        nextCommentId: currentCommentId
      };
    }

    case 'delete': {
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
        children = [
          new DeletedTextRun({
            text: aligned.original,
            id: currentRevisionId++,
            author: AUTHOR,
            date: dateObj,
          })
        ];
      } else {
        const comment = createInlineComment(
          currentCommentId,
          'delete',
          aligned.original,
          null,
          timestamp
        );
        comments.push(comment);

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
        const insertResult = createHighlightedInsertedRuns(aligned.edited, currentRevisionId, dateObj);
        children = insertResult.runs;
        currentRevisionId = insertResult.nextRevisionId;
        if (HIGHLIGHT_INSERTIONS) stats.totalFormattingChanges++;
      } else {
        const comment = createInlineComment(
          currentCommentId,
          'insert',
          null,
          aligned.edited,
          timestamp
        );
        comments.push(comment);

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
 * Create a paragraph with word-level Track Changes and inline comments.
 *
 * @param {string} original - Original paragraph text
 * @param {string} edited - Edited paragraph text
 * @param {number} startRevisionId - Starting revision ID
 * @param {number} startCommentId - Starting comment ID
 * @param {string} timestamp - ISO timestamp for revisions
 * @param {Object} stats - Statistics tracking context
 * @param {Array} comments - Comments array to add to
 * @returns {Object} { paragraph, children, nextRevisionId, nextCommentId }
 */
function createTrackedParagraphWithComments(original, edited, startRevisionId, startCommentId, timestamp, stats, comments) {
  const changes = computeWordDiff(original, edited);
  const textRuns = [];
  let currentRevisionId = startRevisionId;
  let currentCommentId = startCommentId;
  const dateObj = new Date(timestamp);

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const wordCount = countWords(change.text);
    const isSignificant = wordCount >= SIGNIFICANT_CHANGE_THRESHOLD;

    switch (change.type) {
      case 'equal':
        textRuns.push(new TextRun(change.text));
        break;

      case 'delete':
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun(change.text));
          break;
        }

        stats.totalDeletions++;
        stats.wordsDeleted += wordCount;

        if (isSignificant && !DISABLE_COMMENTS && !DISABLE_INLINE_COMMENTS) {
          const nextChange = changes[i + 1];
          const isReplacement = nextChange &&
            nextChange.type === 'insert' &&
            !isWhitespaceOnly(nextChange.text);

          if (isReplacement) {
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

            textRuns.push(new DeletedTextRun({
              text: change.text,
              id: currentRevisionId++,
              author: AUTHOR,
              date: dateObj,
            }));

            stats.totalInsertions++;
            stats.wordsInserted += countWords(nextChange.text);
            const replaceInsertResult = createHighlightedInsertedRuns(nextChange.text, currentRevisionId, dateObj);
            textRuns.push(...replaceInsertResult.runs);
            currentRevisionId = replaceInsertResult.nextRevisionId;
            if (HIGHLIGHT_INSERTIONS) stats.totalFormattingChanges++;

            textRuns.push(new CommentRangeStart(currentCommentId));
            textRuns.push(new TextRun(" "));
            textRuns.push(new CommentRangeEnd(currentCommentId));
            textRuns.push(new CommentReference(currentCommentId));
            currentCommentId++;

            i++;
            break;
          }

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
          textRuns.push(new DeletedTextRun({
            text: change.text,
            id: currentRevisionId++,
            author: AUTHOR,
            date: dateObj,
          }));
        }
        break;

      case 'insert':
        if (isWhitespaceOnly(change.text)) {
          textRuns.push(new TextRun(change.text));
          break;
        }

        stats.totalInsertions++;
        stats.wordsInserted += wordCount;

        if (isSignificant && !DISABLE_COMMENTS && !DISABLE_INLINE_COMMENTS) {
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

/**
 * Create tracked paragraph (legacy interface for backwards compatibility).
 *
 * @param {string} original - Original paragraph text
 * @param {string} edited - Edited paragraph text
 * @param {number} startId - Starting revision ID
 * @param {string} timestamp - ISO timestamp
 * @param {string} author - Author name (unused, kept for compatibility)
 * @returns {Object} { paragraph, nextId }
 */
function createTrackedParagraph(original, edited, startId, timestamp, author) {
  const { createStatsContext } = require('./utils');
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

module.exports = {
  createParagraphFromAlignment,
  createTrackedParagraphWithComments,
  createTrackedParagraph
};
