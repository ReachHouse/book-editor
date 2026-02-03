/**
 * Punctuation Rules
 * Number formatting, time format, compound adjectives, dialogue punctuation, dashes
 */

module.exports = [
  {
    id: 'number-spelling',
    name: 'Number Spelling (1-9)',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Numbers 1-9 should be spelled out
      const numerals1to9 = /\b[1-9]\b/;
      const spelledNumbers = /\b(one|two|three|four|five|six|seven|eight|nine)\b/i;
      return numerals1to9.test(original) && spelledNumbers.test(edited);
    },
    explanation: 'Spelled out number (1-9 should be written as words).',
    rule: 'Numbers: spell out one to nine, use numerals for 10+'
  },
  {
    id: 'compound-adjective-hyphen',
    name: 'Compound Adjective Hyphen',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Compound adjectives before nouns should be hyphenated
      // e.g., "five year old" → "five-year-old"
      const numberWords = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
      const dimensions = ['year', 'month', 'week', 'day', 'hour', 'minute', 'foot', 'inch', 'mile', 'pound', 'dollar'];

      for (const num of numberWords) {
        for (const dim of dimensions) {
          const unhyphenated = new RegExp(`\\b${num}\\s+${dim}\\s+old\\b`, 'i');
          const hyphenated = new RegExp(`\\b${num}-${dim}-old\\b`, 'i');
          if (unhyphenated.test(original) && hyphenated.test(edited)) {
            return true;
          }
        }
      }
      return false;
    },
    explanation: 'Added hyphens to compound adjective before noun.',
    rule: 'Hyphenate compound adjectives: five-year-old child'
  },
  {
    id: 'time-format',
    name: 'Time Format',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // 24-hour or military time to 12-hour format
      const militaryTime = /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/;
      const standardTime = /\b(1[0-2]|[1-9])\s*(am|pm|a\.m\.|p\.m\.)/i;
      return militaryTime.test(original) && standardTime.test(edited);
    },
    explanation: 'Changed to 12-hour time format.',
    rule: 'Time: use 12-hour format with am/pm'
  },
  {
    id: 'word-simplification',
    name: 'Word Simplification',
    category: 'Style',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Complex words that should be simplified
      const simplifications = {
        'utilize': 'use',
        'utilise': 'use',
        'commence': 'begin|start',
        'terminate': 'end|stop',
        'subsequently': 'later|then',
        'prior to': 'before',
        'in order to': 'to',
        'at this point in time': 'now',
        'in the event that': 'if',
        'whilst': 'while',
        'amongst': 'among',
        'towards': 'toward'
      };

      for (const [complex, simple] of Object.entries(simplifications)) {
        const complexRegex = new RegExp(`\\b${complex}\\b`, 'gi');
        const simpleRegex = new RegExp(`\\b(${simple})\\b`, 'gi');

        if (complexRegex.test(original) && simpleRegex.test(edited)) {
          // Check that complex word count decreased
          const origComplex = (original.match(complexRegex) || []).length;
          const editComplex = (edited.match(complexRegex) || []).length;
          if (editComplex < origComplex) {
            return true;
          }
        }
      }
      return false;
    },
    explanation: 'Simplified complex word for clarity.',
    rule: 'Prefer simple words: use not utilize, begin not commence'
  },
  {
    id: 'oxford-comma',
    name: 'Oxford Comma (Serial Comma)',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect addition of Oxford comma before "and" or "or" in a list
      // Pattern: "A, B and C" → "A, B, and C"
      // Pattern: "A, B or C" → "A, B, or C"

      // Count serial comma patterns (comma before and/or in lists)
      const oxfordPattern = /,\s+\w+,\s+(?:and|or)\s+\w+/gi;
      const noOxfordPattern = /,\s+\w+\s+(?:and|or)\s+\w+/gi;

      const origOxford = (original.match(oxfordPattern) || []).length;
      const editOxford = (edited.match(oxfordPattern) || []).length;
      const origNoOxford = (original.match(noOxfordPattern) || []).length;
      const editNoOxford = (edited.match(noOxfordPattern) || []).length;

      // Oxford comma added: more Oxford patterns in edited, fewer non-Oxford patterns
      if (editOxford > origOxford && editNoOxford < origNoOxford) {
        return true;
      }

      return false;
    },
    explanation: 'Added Oxford comma (serial comma) before the final item in a list for clarity.',
    rule: 'Use the Oxford comma (serial comma) before "and" or "or" in lists of three or more items.'
  },
  {
    id: 'em-dash-en-dash',
    name: 'Em-dash/En-dash Usage',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect conversion of hyphens to em-dashes or en-dashes
      // Hyphens surrounded by spaces " - " → em-dash " — " or "—"
      // Hyphens in ranges "1-10" → en-dash "1–10"

      // Count em-dashes (—) and en-dashes (–)
      const emDashCount = (str) => (str.match(/—/g) || []).length;
      const enDashCount = (str) => (str.match(/–/g) || []).length;

      // Count double hyphens that should be em-dashes
      const doubleHyphenCount = (str) => (str.match(/--/g) || []).length;

      // Count spaced hyphens that should be em-dashes
      const spacedHyphenCount = (str) => (str.match(/\s+-\s+/g) || []).length;

      const origEmDash = emDashCount(original);
      const editEmDash = emDashCount(edited);
      const origEnDash = enDashCount(original);
      const editEnDash = enDashCount(edited);
      const origDoubleHyphen = doubleHyphenCount(original);
      const editDoubleHyphen = doubleHyphenCount(edited);
      const origSpacedHyphen = spacedHyphenCount(original);
      const editSpacedHyphen = spacedHyphenCount(edited);

      // Em-dash added: more em-dashes, fewer double/spaced hyphens
      if (editEmDash > origEmDash && (editDoubleHyphen < origDoubleHyphen || editSpacedHyphen < origSpacedHyphen)) {
        return true;
      }

      // En-dash added: more en-dashes in edited
      if (editEnDash > origEnDash) {
        return true;
      }

      return false;
    },
    explanation: 'Corrected dash usage: em-dash (—) for breaks in thought, en-dash (–) for ranges.',
    rule: 'Use em-dash (—) for parenthetical breaks; en-dash (–) for number ranges and connections.'
  }
];
