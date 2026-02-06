/**
 * =============================================================================
 * REACH HOUSE STYLE GUIDE
 * =============================================================================
 *
 * This file contains the official Reach House Style Guide that
 * governs all manuscript editing. This is the SINGLE SOURCE OF TRUTH for
 * editing standards - both the backend AI prompts and frontend display
 * reference this file.
 *
 * USAGE:
 * ------
 * Backend (services/anthropicService.js):
 *   - Included in the system prompt sent to Claude AI
 *   - Ensures all AI edits follow these standards
 *
 * Frontend (constants/index.js):
 *   - A copy is maintained for the Style Guide modal display
 *   - If updating rules, update BOTH locations
 *
 * STYLE GUIDE AUTHORITY:
 * ----------------------
 * Based on the Oxford Style Manual by R.M. Ritter
 * Specific adaptations for South African context (race term capitalization)
 * Maintained by Sally Veenman, Head of Editing Department
 *
 * MODIFICATION:
 * -------------
 * When updating these rules:
 * 1. Update this file (config/styleGuide.js)
 * 2. Update frontend/src/constants/index.js (FULL_STYLE_GUIDE_DOCUMENT)
 * 3. Increment version in frontend/src/constants/version.js
 * 4. Use [Docs] tag for version if only documentation changed
 *
 * =============================================================================
 */

const STYLE_GUIDE = `REACH HOUSE STYLE GUIDE

All edits follow UK English (Oxford Style Manual by R.M. Ritter)

KEY RULES:
• UK spelling: -ise not -ize (realise, organise), honour not honor, travelled not traveled
• Metric system: metres, centimetres, kilometres
• Special care with apostrophes - never for plurals (CDs not CD's, 1960s not 1960's)
• your vs you're, its vs it's
• Race terms: Black, White, Coloured (capitalized in South African context)
• who for people, that/which for things
• Numbers 1-9 spelled out, 10+ numerical (unless starting sentence)
• Italics for: foreign words, slang, emphasis, book/magazine/newspaper titles, internal thoughts
• Proper nouns capitalized: "Can Dad come?" vs "my dad is here"
• Hyphens: "two years old" vs "two-year-old boy"
• Times: 4am, four o'clock (not 16h00)
• Book/movie titles in italics: The Great Gatsby
• Direct dialogue: double quotes, new speaker = new line
• Comma before dialogue tag: "No," she said.
• Watch for repetition, consistency, concord errors
• Replace difficult/uncommon words with simpler alternatives
• No deletions without author consent
• Highlight all changes so author can review

CRITICAL: All changes must be highlighted/tracked.`;

// Validate style guide at module load time
if (!STYLE_GUIDE || typeof STYLE_GUIDE !== 'string' || STYLE_GUIDE.length === 0) {
  throw new Error('STYLE_GUIDE configuration is invalid or empty');
}

module.exports = { STYLE_GUIDE };
