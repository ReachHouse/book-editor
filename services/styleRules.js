/**
 * =============================================================================
 * STYLE RULES MODULE
 * =============================================================================
 *
 * Defines detection functions for Reach Publishers House Style Guide rules.
 * Used by documentService.js to categorize changes and provide educational
 * comments explaining WHY a change was made.
 *
 * Each rule has:
 * - id: Unique identifier
 * - name: Human-readable name
 * - category: Category for grouping (Spelling, Grammar, Punctuation, Style)
 * - detect(original, edited): Returns true if this rule was applied
 * - explanation: Educational text explaining the change
 * - rule: The actual style guide rule text
 *
 * =============================================================================
 */

const STYLE_RULES = [
  // ===========================================================================
  // UK SPELLING RULES
  // ===========================================================================
  {
    id: 'uk-spelling-ise',
    name: 'UK Spelling (-ise)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const izePattern = /\b\w+ize[sd]?\b/i;
      const isePattern = /\b\w+ise[sd]?\b/i;
      return izePattern.test(original) && isePattern.test(edited);
    },
    explanation: 'Changed to UK spelling (-ise not -ize) per Reach Publishers style.',
    rule: 'UK spelling: -ise not -ize (realise, organise)'
  },
  {
    id: 'uk-spelling-our',
    name: 'UK Spelling (-our)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const orPattern = /\b(honor|color|favor|labor|neighbor|humor|flavor|behavior|harbor|rumor)\b/i;
      const ourPattern = /\b(honour|colour|favour|labour|neighbour|humour|flavour|behaviour|harbour|rumour)\b/i;
      return orPattern.test(original) && ourPattern.test(edited);
    },
    explanation: 'Changed to UK spelling (-our not -or) per Reach Publishers style.',
    rule: 'UK spelling: honour not honor, colour not color'
  },
  {
    id: 'uk-spelling-double-l',
    name: 'UK Spelling (doubled L)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const singleL = /\b(traveled|traveling|traveler|canceled|canceling|labeled|labeling|modeled|modeling)\b/i;
      const doubleL = /\b(travelled|travelling|traveller|cancelled|cancelling|labelled|labelling|modelled|modelling)\b/i;
      return singleL.test(original) && doubleL.test(edited);
    },
    explanation: 'Changed to UK spelling (doubled L) per Reach Publishers style.',
    rule: 'UK spelling: travelled not traveled, cancelled not canceled'
  },
  {
    id: 'uk-spelling-re',
    name: 'UK Spelling (-re)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const erPattern = /\b(center|theater|meter|liter|fiber|somber)\b/i;
      const rePattern = /\b(centre|theatre|metre|litre|fibre|sombre)\b/i;
      return erPattern.test(original) && rePattern.test(edited);
    },
    explanation: 'Changed to UK spelling (-re not -er) per Reach Publishers style.',
    rule: 'UK spelling: centre not center, theatre not theater'
  },

  // ===========================================================================
  // METRIC SYSTEM
  // ===========================================================================
  {
    id: 'metric-system',
    name: 'Metric System',
    category: 'Units',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const imperial = /\b(feet|foot|inches|inch|miles|yards|pounds|ounces|gallons|pints)\b/i;
      const metric = /\b(metres|meters|centimetres|centimeters|kilometres|kilometers|kilograms|grams|litres|liters)\b/i;
      return imperial.test(original) && metric.test(edited);
    },
    explanation: 'Changed to metric system per UK style requirements.',
    rule: 'Metric system: metres, centimetres, kilometres'
  },

  // ===========================================================================
  // APOSTROPHE RULES
  // ===========================================================================
  {
    id: 'apostrophe-plural',
    name: 'Apostrophe in Plural',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect removal of apostrophe from plurals
      const wrongApostrophe = /\b(\d+)'s\b|\b(CD|DVD|TV|PC|MP3|CEO|ATM)'s\b/i;
      const correctPlural = /\b\d+s\b|\b(CDs|DVDs|TVs|PCs|MP3s|CEOs|ATMs)\b/i;
      return wrongApostrophe.test(original) && correctPlural.test(edited);
    },
    explanation: 'Removed apostrophe from plural. Apostrophes are never used for plurals.',
    rule: 'Apostrophes: CDs not CD\'s, 1960s not 1960\'s'
  },
  {
    id: 'its-vs-its',
    name: 'Its vs It\'s',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect correction from it's to its or vice versa
      const origIts = (original.match(/\bits\b/gi) || []).length;
      const origIts2 = (original.match(/\bit's\b/gi) || []).length;
      const editIts = (edited.match(/\bits\b/gi) || []).length;
      const editIts2 = (edited.match(/\bit's\b/gi) || []).length;
      return (origIts !== editIts && origIts2 !== editIts2);
    },
    explanation: 'Corrected its/it\'s usage. it\'s = it is; its = possessive.',
    rule: 'Special care: its (possessive) vs it\'s (it is)'
  },
  {
    id: 'your-vs-youre',
    name: 'Your vs You\'re',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const origYour = (original.match(/\byour\b/gi) || []).length;
      const origYoure = (original.match(/\byou're\b/gi) || []).length;
      const editYour = (edited.match(/\byour\b/gi) || []).length;
      const editYoure = (edited.match(/\byou're\b/gi) || []).length;
      return (origYour !== editYour && origYoure !== editYoure);
    },
    explanation: 'Corrected your/you\'re usage. you\'re = you are; your = possessive.',
    rule: 'Special care: your (possessive) vs you\'re (you are)'
  },

  // ===========================================================================
  // RACE TERMS
  // ===========================================================================
  {
    id: 'race-term-capitalization',
    name: 'Race Term Capitalization',
    category: 'Capitalization',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Check that original has lowercase race term (without i flag) and edited has uppercase
      const lowercase = /\b(black|white|coloured)\s+(people|community|man|woman|men|women|person|child|children)\b/;
      const uppercase = /\b(Black|White|Coloured)\s+(people|community|man|woman|men|women|person|child|children)\b/;
      return lowercase.test(original) && uppercase.test(edited);
    },
    explanation: 'Capitalized race term per South African context guidelines.',
    rule: 'Race terms: Black, White, Coloured (capitalized in South African context)'
  },

  // ===========================================================================
  // WHO/THAT/WHICH
  // ===========================================================================
  {
    id: 'who-for-people',
    name: 'Who for People',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect that/which changed to who when likely referring to people
      const thatForPeople = /\b(person|man|woman|child|people|someone|anyone|everyone)\s+(that|which)\b/i;
      const whoForPeople = /\b(person|man|woman|child|people|someone|anyone|everyone)\s+who\b/i;
      return thatForPeople.test(original) && whoForPeople.test(edited);
    },
    explanation: 'Changed to "who" for referring to people. Use that/which for things.',
    rule: 'Who for people, that/which for things'
  },

  // ===========================================================================
  // NUMBER FORMATTING
  // ===========================================================================
  {
    id: 'number-spelling',
    name: 'Number Spelling',
    category: 'Style',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const numerals1to9 = /\b[1-9]\b/;
      const words1to9 = /\b(one|two|three|four|five|six|seven|eight|nine)\b/i;
      return numerals1to9.test(original) && words1to9.test(edited);
    },
    explanation: 'Spelled out single-digit number per style guide.',
    rule: 'Numbers 1-9 spelled out, 10+ numerical'
  },

  // ===========================================================================
  // HYPHEN RULES
  // ===========================================================================
  {
    id: 'compound-adjective-hyphen',
    name: 'Compound Adjective Hyphen',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect addition of hyphens in compound adjectives before nouns
      const noHyphen = /\b(two|three|four|five|six|seven|eight|nine|ten)\s+(year|month|day|week|hour|minute|foot|mile)\s+(old|long|high|wide|deep|tall)\b/i;
      const withHyphen = /\b(two|three|four|five|six|seven|eight|nine|ten)-(year|month|day|week|hour|minute|foot|mile)-(old|long|high|wide|deep|tall)\b/i;
      return noHyphen.test(original) && withHyphen.test(edited);
    },
    explanation: 'Added hyphens to compound adjective before noun.',
    rule: 'Hyphens: "two years old" vs "a two-year-old boy"'
  },

  // ===========================================================================
  // TIME FORMATTING
  // ===========================================================================
  {
    id: 'time-format',
    name: 'Time Formatting',
    category: 'Style',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const militaryTime = /\b\d{1,2}h\d{2}\b/;
      const standardTime = /\b\d{1,2}(am|pm)\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+o'clock\b/i;
      return militaryTime.test(original) && standardTime.test(edited);
    },
    explanation: 'Changed to preferred time format per style guide.',
    rule: 'Times: 4am, four o\'clock (not 16h00)'
  },

  // ===========================================================================
  // DIALOGUE FORMATTING
  // ===========================================================================
  {
    id: 'dialogue-double-quotes',
    name: 'Dialogue Double Quotes',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect change from single to double quotes for dialogue
      const singleQuotes = /'[^']+'/;
      const doubleQuotes = /"[^"]+"/;
      const origHasSingle = singleQuotes.test(original);
      const editHasDouble = doubleQuotes.test(edited);
      return origHasSingle && editHasDouble && !doubleQuotes.test(original);
    },
    explanation: 'Changed to double quotes for dialogue per style guide.',
    rule: 'Dialogue: double quotes for spoken words'
  },
  {
    id: 'dialogue-comma',
    name: 'Dialogue Tag Comma',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect missing comma before dialogue tag
      // noComma pattern: text ending with non-comma, non-quote char before closing quote
      const noComma = /"[^"]+[^,"]"\s+(he|she|they|I|we|it)\s+said/i;
      const withComma = /"[^"]+,"\s+(he|she|they|I|we|it)\s+said/i;
      return noComma.test(original) && withComma.test(edited);
    },
    explanation: 'Added comma before dialogue tag per style guide.',
    rule: 'Comma before dialogue tag: "No," she said.'
  }
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
      console.error(`Style rule detection error for ${rule.id}:`, error.message);
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

module.exports = {
  STYLE_RULES,
  detectStyleViolations,
  getStyleRuleById
};
