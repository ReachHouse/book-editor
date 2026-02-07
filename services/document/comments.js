/** Comment Creation — Summary and inline Word comments for track changes. */

const { Paragraph, TextRun } = require('docx');
const { STYLE_RULES } = require('../styleRules');
const { AUTHOR } = require('./constants');
const { countWords } = require('./utils');
const { categorizeChange } = require('./categorization');

// Pre-build Map for O(1) style rule lookup by ID
const STYLE_RULES_BY_ID = new Map(STYLE_RULES.map(r => [r.id, r]));

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
    `Edited: ${new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')}`,
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
      const rule = STYLE_RULES_BY_ID.get(ruleId);
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

module.exports = {
  createSummaryComment,
  createInlineComment
};
