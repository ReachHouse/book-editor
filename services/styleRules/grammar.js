/**
 * Grammar Rules
 * Apostrophes, pronouns, and general grammar conventions
 */

module.exports = [
  {
    id: 'apostrophe-plural',
    name: 'Apostrophe in Plural',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Check for removal of apostrophe from plurals like 1960's → 1960s or NGO's → NGOs
      const wrongPlural = /\b(\d+)'s\b|\b(CD|DVD|TV|PC|MP3|CEO|ATM)'s\b/i;
      const correctPlural = /\b(\d+)s\b|\b(CD|DVD|TV|PC|MP3|CEO|ATM)s\b/i;
      return wrongPlural.test(original) && correctPlural.test(edited);
    },
    explanation: 'Removed apostrophe from plural. Apostrophes are for possession or contractions, not plurals.',
    rule: 'Plurals: 1960s not 1960\'s, CDs not CD\'s'
  },
  {
    id: 'its-vs-its',
    name: 'Its vs It\'s',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const itsCount = (str) => (str.match(/\bits\b/gi) || []).length;
      const itsApostropheCount = (str) => (str.match(/\bit's\b/gi) || []).length;
      const origIts = itsCount(original);
      const origIts2 = itsApostropheCount(original);
      const editIts = itsCount(edited);
      const editIts2 = itsApostropheCount(edited);
      // If counts swapped, a correction was made
      return (origIts !== editIts && origIts2 !== editIts2);
    },
    explanation: 'Corrected its/it\'s. its = possessive (its tail), it\'s = it is/it has.',
    rule: 'its (possessive) vs it\'s (it is/it has)'
  },
  {
    id: 'your-vs-youre',
    name: 'Your vs You\'re',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const yourCount = (str) => (str.match(/\byour\b/gi) || []).length;
      const youreCount = (str) => (str.match(/\byou're\b/gi) || []).length;
      const origYour = yourCount(original);
      const origYoure = youreCount(original);
      const editYour = yourCount(edited);
      const editYoure = youreCount(edited);
      return (origYour !== editYour && origYoure !== editYoure);
    },
    explanation: 'Corrected your/you\'re. your = possessive, you\'re = you are.',
    rule: 'your (possessive) vs you\'re (you are)'
  },
  {
    id: 'race-term-capitalization',
    name: 'Race Term Capitalization',
    category: 'Capitalization',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Check for capitalization of race/ethnicity terms
      // Must verify original has ACTUAL lowercase (case-sensitive check)
      const lowercasePattern = /\b(black|white|coloured|african|indian|asian)\s+(people|community|man|woman|men|women|person|persons|population)\b/;
      const capitalizedPattern = /\b(Black|White|Coloured|African|Indian|Asian)\s+(people|community|man|woman|men|women|person|persons|population)\b/;

      // Original must have lowercase version (not already capitalized)
      const hasLowercase = lowercasePattern.test(original);
      const alreadyCapitalized = capitalizedPattern.test(original);
      const editedHasCapitalized = capitalizedPattern.test(edited);

      // Only detect if original had lowercase AND edited has capitalized
      return hasLowercase && !alreadyCapitalized && editedHasCapitalized;
    },
    explanation: 'Capitalized race/ethnicity terms as proper nouns per style guide.',
    rule: 'Capitalize race/ethnicity: Black, White, Coloured (SA context)'
  },
  {
    id: 'who-for-people',
    name: 'Who for People',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Check for changing "that" or "which" to "who" when referring to people
      const thatWhichPeople = /\b(person|people|man|woman|boy|girl|child|children|someone|anyone|everyone)\s+(that|which)\b/i;
      const whoPeople = /\b(person|people|man|woman|boy|girl|child|children|someone|anyone|everyone)\s+who\b/i;
      return thatWhichPeople.test(original) && whoPeople.test(edited);
    },
    explanation: 'Changed to "who" for people (not "that" or "which").',
    rule: 'Use "who" for people, "that/which" for things'
  },
  {
    id: 'proper-noun-family',
    name: 'Proper Noun (Family Terms)',
    category: 'Capitalization',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Family terms as names (direct address or standing alone as subject)
      // "Can Dad come?" vs "my dad is here"
      // Also: "said dad" → "said Dad" (dialogue attribution)
      const familyTerms = ['mom', 'mum', 'dad', 'mother', 'father', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'granny', 'aunt', 'uncle'];

      for (const term of familyTerms) {
        const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1);

        // Pattern 1: at start of sentence, after punctuation, or direct address
        const asNameLower = new RegExp(`(^|[.!?]\\s+|,\\s*)${term}\\b`, 'i');
        const asNameUpper = new RegExp(`(^|[.!?]\\s+|,\\s*)${capitalizedTerm}\\b`);

        if (asNameLower.test(original) && asNameUpper.test(edited)) {
          return true;
        }

        // Pattern 2: after dialogue verbs - "said dad" → "said Dad"
        // Use case-sensitive match for the family term to distinguish lowercase from uppercase
        const afterVerbLower = new RegExp(`(?:said|asked|told|called|shouted|whispered|replied|answered|cried|exclaimed)\\s+${term}\\b`);
        const afterVerbUpper = new RegExp(`(?:said|asked|told|called|shouted|whispered|replied|answered|cried|exclaimed)\\s+${capitalizedTerm}\\b`);

        // Check original has lowercase after verb and edited has uppercase
        if (afterVerbLower.test(original) && !afterVerbLower.test(edited) && afterVerbUpper.test(edited)) {
          return true;
        }
      }
      return false;
    },
    explanation: 'Capitalized family term used as proper noun/name.',
    rule: 'Capitalize family terms when used as names: "Can Dad come?" but "my dad is here"'
  }
];
