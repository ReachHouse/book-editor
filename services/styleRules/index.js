/** Style Rules — Aggregates all style rule modules for change detection and categorization. */

// Import category modules
const spellingRules = require('./spelling');
const grammarRules = require('./grammar');
const homophoneRules = require('./homophones');
const punctuationRules = require('./punctuation');
const dialogueRules = require('./dialogue');
const formattingRules = require('./formatting');
const concordRules = require('./concord');
const logger = require('../logger');

/**
 * Combined array of all style rules from all categories.
 * Current total: 31 rules
 */
const STYLE_RULES = [
  ...spellingRules,       // 5 rules: UK spelling, metric
  ...grammarRules,        // 6 rules: apostrophes, pronouns, capitalization
  ...homophoneRules,      // 4 rules: practice/practise, there/their, then/than, too/to
  ...punctuationRules,    // 6 rules: numbers, time, hyphens, simplification, oxford comma, dashes
  ...dialogueRules,       // 4 rules: quotes, comma, new speaker, continuation
  ...formattingRules,     // 3 rules: italics for foreign, titles, thoughts
  ...concordRules         // 3 rules: pronoun shift, subject-verb, neither/nor
];

/**
 * Detect all style rule violations/corrections in a text change.
 * Returns array of all matching rules for comprehensive reporting.
 *
 * @param {string} original - Original text
 * @param {string} edited - Edited text
 * @returns {Array} Array of matching rule objects
 */
function detectStyleViolations(original, edited) {
  const violations = [];

  for (const rule of STYLE_RULES) {
    try {
      if (rule.detect(original, edited)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          explanation: rule.explanation,
          styleGuideRef: rule.rule
        });
      }
    } catch (error) {
      // Skip rule if detection fails
      logger.error('Style rule detection error', { ruleId: rule.id, error: error.message });
    }
  }

  return violations;
}

/**
 * Get a style rule by ID.
 *
 * @param {string} ruleId - The rule ID to look up
 * @returns {Object|null} The rule object or null if not found
 */
function getStyleRuleById(ruleId) {
  return STYLE_RULES.find(r => r.id === ruleId) || null;
}

/**
 * Get all rules in a specific category.
 *
 * @param {string} category - The category name
 * @returns {Array} Array of rules in that category
 */
function getRulesByCategory(category) {
  return STYLE_RULES.filter(r => r.category === category);
}

/**
 * Get all unique categories.
 *
 * @returns {Array} Array of category names
 */
function getCategories() {
  return [...new Set(STYLE_RULES.map(r => r.category))];
}

module.exports = {
  STYLE_RULES,
  detectStyleViolations,
  getStyleRuleById,
  getRulesByCategory,
  getCategories
};
