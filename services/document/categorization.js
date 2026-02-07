/** Change Categorization — Classifies changes by style guide rules or generic patterns. */

const { STYLE_RULES } = require('../styleRules');
const { countWords } = require('./utils');

// Grammar patterns for generic categorization (module-level for performance)
const GRAMMAR_PATTERNS = [
  { pattern: /\b(is|are|was|were|be|been|being)\b/, name: "Verb tense", explanation: "Verb tense adjusted for consistency." },
  { pattern: /\b(a|an|the)\b/, name: "Article", explanation: "Article usage corrected." },
  { pattern: /\b(who|whom|whose|which|that)\b/, name: "Pronoun/relative clause", explanation: "Relative pronoun corrected for proper reference." },
  { pattern: /\b(very|really|quite|rather)\b/, name: "Intensifier", explanation: "Intensifier removed or modified for stronger prose." },
];

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
    return {
      category: "Addition",
      rule: null,
      explanation: "New content added.",
      isStyleRule: false,
      ruleId: null
    };
  }
  if (original && !edited) {
    return {
      category: "Removal",
      rule: null,
      explanation: "Content removed for clarity or concision.",
      isStyleRule: false,
      ruleId: null
    };
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
    return {
      category: "Punctuation",
      rule: null,
      explanation: "Punctuation adjusted for clarity.",
      isStyleRule: false,
      ruleId: null
    };
  }

  // Check for case-only changes
  if (origLower === editLower) {
    return {
      category: "Capitalization",
      rule: null,
      explanation: "Capitalization corrected.",
      isStyleRule: false,
      ruleId: null
    };
  }

  // Check for common grammar patterns
  for (const { pattern, name, explanation } of GRAMMAR_PATTERNS) {
    const origMatch = pattern.test(origLower);
    const editMatch = pattern.test(editLower);
    if (origMatch !== editMatch) {
      return {
        category: name + " adjustment",
        rule: null,
        explanation,
        isStyleRule: false,
        ruleId: null
      };
    }
  }

  // Check for word replacement (similar length = likely style change)
  const origWords = countWords(original);
  const editWords = countWords(edited);
  const wordDiff = Math.abs(origWords - editWords);

  if (wordDiff === 0) {
    return {
      category: "Word choice",
      rule: null,
      explanation: "Word choice refined for clarity or style.",
      isStyleRule: false,
      ruleId: null
    };
  }
  if (wordDiff <= 2) {
    return {
      category: "Clarity improvement",
      rule: null,
      explanation: "Phrasing adjusted for better clarity.",
      isStyleRule: false,
      ruleId: null
    };
  }
  if (editWords > origWords) {
    return {
      category: "Expansion for clarity",
      rule: null,
      explanation: "Text expanded to improve understanding.",
      isStyleRule: false,
      ruleId: null
    };
  }
  if (editWords < origWords) {
    return {
      category: "Concision improvement",
      rule: null,
      explanation: "Text condensed for tighter prose.",
      isStyleRule: false,
      ruleId: null
    };
  }

  return {
    category: "Style refinement",
    rule: null,
    explanation: "Style adjusted per house guidelines.",
    isStyleRule: false,
    ruleId: null
  };
}

module.exports = {
  categorizeChange
};
