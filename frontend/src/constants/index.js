/**
 * =============================================================================
 * APPLICATION CONSTANTS
 * =============================================================================
 *
 * Central location for all configuration values used throughout the frontend.
 * This file serves as a single source of truth for configuration, making it
 * easy to adjust settings without searching through component code.
 *
 * CONTENTS:
 * ---------
 * 1. API Configuration - Backend communication settings
 * 2. Document Processing - Chunk sizes for text processing
 * 3. Style Guide - Reach Publishers House Style (condensed for UI)
 * 4. Full Style Guide - Complete document for modal display
 * 5. Version Exports - Re-exported from version.js
 *
 * IMPORTANT:
 * ----------
 * - The STYLE_GUIDE constant here is a COPY of the backend version
 *   (config/styleGuide.js). If updating style rules, update BOTH files.
 * - Version information is managed in version.js - see that file for
 *   instructions on updating version numbers.
 *
 * RELATED FILES:
 * --------------
 * - version.js: Version system (VERSION, VERSION_TAG, VERSION_DATE)
 * - /config/styleGuide.js: Backend copy of style guide (used in AI prompts)
 *
 * =============================================================================
 */

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * Base URL for API requests.
 * Empty string means use relative URLs (same origin as frontend).
 * This works because the backend serves both the API and the static frontend.
 *
 * In development with separate servers, you might set this to:
 * 'http://localhost:3001'
 */
export const API_BASE_URL = '';

/**
 * API retry configuration for handling transient failures.
 *
 * The frontend uses exponential backoff when API calls fail:
 * - Attempt 1: Wait 2000ms (2s)
 * - Attempt 2: Wait 4000ms (4s)
 * - Attempt 3: Wait 6000ms (6s)
 * - After 3 failures: Give up and show error
 *
 * This helps handle temporary network issues or server overload
 * without immediately failing the entire editing session.
 */
export const API_CONFIG = {
  MAX_RETRIES: 3,             // Maximum retry attempts per API call
  RETRY_DELAY_BASE: 2000      // Base delay in milliseconds (multiplied by attempt number)
};

// =============================================================================
// DOCUMENT PROCESSING CONFIGURATION
// =============================================================================

/**
 * Chunk sizes control how the document is split for processing.
 *
 * WHY CHUNKING:
 * The Claude API has token limits, so we can't send entire books at once.
 * Documents are split into chunks of approximately this many words each.
 *
 * CHUNK SIZE TRADE-OFFS:
 * - Smaller chunks (1000 words): More API calls, but each is faster and cheaper
 * - Larger chunks (3000 words): Fewer API calls, but more context for AI
 *
 * We use different sizes for new vs resumed projects to maintain backward
 * compatibility with projects saved before chunk size changes.
 */
export const CHUNK_SIZES = {
  NEW_DOCUMENTS: 2000,    // Words per chunk for new documents (optimal balance)
  LEGACY_DEFAULT: 3000    // Words per chunk for legacy/resumed projects
};

// =============================================================================
// STYLE GUIDE (CONDENSED VERSION FOR UI DISPLAY)
// =============================================================================

/**
 * Condensed Reach Publishers House Style Guide.
 *
 * This is displayed in the UI and used as a quick reference.
 * The full version (FULL_STYLE_GUIDE_DOCUMENT below) is shown in the modal.
 *
 * IMPORTANT: This must match the backend config/styleGuide.js
 * If you update style rules, update BOTH files!
 *
 * Based on: Oxford Style Manual by R.M. Ritter
 * Maintained by: Sally Veenman, Head of Editing Department
 */
export const STYLE_GUIDE = `REACH PUBLISHERS HOUSE STYLE GUIDE

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

// =============================================================================
// FULL STYLE GUIDE DOCUMENT (FOR MODAL DISPLAY)
// =============================================================================

/**
 * Complete Reach Publishers New Editors' Guidelines.
 *
 * This comprehensive document is displayed in the Style Guide Modal
 * when users click "View Reach Publishers Style Guide" button.
 *
 * It contains the full editing brief from Sally Veenman including:
 * - UK English requirements
 * - Grammar rules
 * - Apostrophe usage
 * - Race term capitalization (South African context)
 * - Number formatting
 * - Fiction-specific tips
 * - And more
 */
export const FULL_STYLE_GUIDE_DOCUMENT = `REACH PUBLISHERS NEW EDITORS' GUIDELINES TO HOUSE STYLE - Editing Brief

All our edits (if not a proofread) are in-depth edits i.e. it is not just a simple proofread, but rather a thorough in-depth edit looking at all facets including the following:

UK SPELLING NOT US (unless otherwise specified). (also not SA -- pref. UK)

GRAMMAR: Editor to correct the following:

Check general grammar, spelling, punctuation, sentence construction, tenses, prepositions, Number and concord

(1) Consistency in the use of capitals and of the chosen form of English (i.e. US, SA or UK); We work off the Oxford Style Manual (R.M. Ritter) -- UK English

We follow the UK style which means using the metric system e.g. metres and centimetres and s rather than z (realise not realize); honour not honor; travelled not traveled etc.

(2) GENERAL

Watch for misuse of APOSTROPHES (common error) or missing apostrophes.

The rules concerning the use of apostrophes in written English are very simple:

* They are used to denote a missing letter or letters
* They are used to denote possession
* Apostrophes are NEVER ever used to denote plurals!

NOTE: Special care must be taken over the use of your and you're, it's and its.

RACE

Most recently it has become more common practice to capitalize Black, White and Coloured in the South African context.

REPETITION - Look out for too much repetition of words or phrases

CONSISTENCY - Watch for consistency - names spelt same throughout etc.

WHO/THAT/WHICH - who always refers to people

NUMBERS - 1-9 spelt out and 10+ in numerical

ITALICS - Slang or foreign words, emphasis, titles of books/magazines/newspapers, internal thought

PROPER NOUNS vs COMMON NOUNS - Check for capitalization rules

HYPHENS - "two years old" vs "two-year-old boy"

TIMES - 4am, four o'clock preferred over 16h00

FICTION TIPS:
- Internal thoughts in italics
- New speaker, new line
- Consistent quotation marks throughout

CONCORD - Watch for singular/plural agreement

The aim is to change whatever needs changing so the book reads well in good English form. As you make the changes, highlight them to bring the author's attention to them.

Kind regards
Sally Veenman
Reach Publishers, Head of Editing Department`;

// =============================================================================
// VERSION EXPORTS
// =============================================================================

/**
 * Re-export version information from version.js
 *
 * This allows components to import version info from either file:
 *   import { VERSION_DISPLAY } from './constants';
 * or
 *   import { VERSION_DISPLAY } from './constants/version';
 *
 * See version.js for full documentation on the version system.
 */
export { VERSION, VERSION_TAG, VERSION_DATE, VERSION_DISPLAY } from './version';
