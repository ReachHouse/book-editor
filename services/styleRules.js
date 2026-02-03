/**
 * =============================================================================
 * STYLE RULES MODULE (Backwards Compatibility)
 * =============================================================================
 *
 * This file re-exports from the modular styleRules/ directory.
 * The rules have been split into category modules for maintainability:
 *
 * styleRules/
 * ├── index.js       - Main entry, combines all modules
 * ├── spelling.js    - UK spelling, metric system (5 rules)
 * ├── grammar.js     - Apostrophes, pronouns, capitalization (6 rules)
 * ├── homophones.js  - Commonly confused words (4 rules)
 * ├── punctuation.js - Numbers, time, hyphens, dashes (6 rules)
 * ├── dialogue.js    - Direct speech formatting (4 rules)
 * ├── formatting.js  - Italics for foreign, titles, thoughts (3 rules)
 * └── concord.js     - Subject-verb agreement (3 rules)
 *
 * Total: 31 rules
 *
 * =============================================================================
 */

module.exports = require('./styleRules/index');
