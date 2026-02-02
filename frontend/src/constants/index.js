/**
 * Application Constants
 * Central location for all configuration values
 */

// API Configuration
export const API_BASE_URL = '';

export const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 2000  // ms
};

// Document Processing
export const CHUNK_SIZES = {
  NEW_DOCUMENTS: 2000,    // words per chunk for new documents
  LEGACY_DEFAULT: 3000    // words per chunk for legacy/resumed projects
};

// Style Guide (condensed version for UI display)
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

// Full Style Guide Document (for modal display)
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

// Re-export version info
export { VERSION, VERSION_TAG, VERSION_DATE, VERSION_DISPLAY } from './version';
