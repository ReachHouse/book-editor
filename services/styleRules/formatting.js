/**
 * Formatting Rules
 * Italics for foreign words, book titles, and internal thought
 */

module.exports = [
  {
    id: 'italics-foreign-words',
    name: 'Italics for Foreign Words',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect italicization of foreign words/phrases
      // In plain text, we use *asterisks* to mark italics
      const foreignPhrases = [
        'bona fide', 'status quo', 'per se', 'ad hoc', 'de facto',
        'etc', 'et cetera', 'vice versa', 'modus operandi',
        'pro bono', 'quid pro quo', 'carte blanche', 'fait accompli',
        'joie de vivre', 'raison d\'être', 'laissez-faire',
        // South African terms
        'ubuntu', 'braai', 'lekker', 'bakkie', 'stoep', 'veld',
        'biltong', 'rooibos', 'boerewors', 'potjiekos'
      ];

      for (const phrase of foreignPhrases) {
        // Check if phrase exists without italics in original and with italics in edited
        const plainRegex = new RegExp(`(?<!\\*)\\b${phrase}\\b(?!\\*)`, 'i');
        const italicsRegex = new RegExp(`\\*${phrase}\\*`, 'i');

        if (plainRegex.test(original) && italicsRegex.test(edited)) {
          return true;
        }
      }
      return false;
    },
    explanation: 'Added italics for foreign word/phrase.',
    rule: 'Italicize foreign words and phrases not commonly used in English.'
  },
  {
    id: 'italics-book-titles',
    name: 'Italics for Book Titles',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect italicization of book/publication titles
      // Look for title-case phrases that got wrapped in asterisks

      // Pattern: Multiple capitalized words → *Multiple Capitalized Words*
      const titlePattern = /\b([A-Z][a-z]+(?:\s+(?:the|a|an|of|in|on|at|to|for|and|but|or|nor)\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
      const italicsTitlePattern = /\*([A-Z][a-z]+(?:\s+(?:the|a|an|of|in|on|at|to|for|and|but|or|nor)\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\*/g;

      const origTitles = (original.match(titlePattern) || []).length;
      const editItalicsTitles = (edited.match(italicsTitlePattern) || []).length;

      // If we have title patterns in original and italicized titles in edited
      if (origTitles > 0 && editItalicsTitles > 0) {
        // Check if a specific title was italicized
        const origMatches = original.match(titlePattern) || [];
        for (const title of origMatches) {
          const italicsVersion = `*${title}*`;
          if (edited.includes(italicsVersion) && !original.includes(italicsVersion)) {
            return true;
          }
        }
      }
      return false;
    },
    explanation: 'Added italics for book/publication title.',
    rule: 'Italicize titles of books, newspapers, magazines, and other publications.'
  },
  {
    id: 'italics-internal-thought',
    name: 'Italics for Internal Thought',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect italicization of internal thought
      // Pattern: thought markers followed by non-quoted text → italicized

      // Common thought markers
      const thoughtMarkers = [
        'thought', 'wondered', 'realized', 'knew', 'felt',
        'considered', 'pondered', 'mused', 'reflected'
      ];

      for (const marker of thoughtMarkers) {
        // Pattern: "She thought, This is strange." → "She thought, *This is strange.*"
        const thoughtPattern = new RegExp(`(${marker}),?\\s+([A-Z][^.!?*]+[.!?])`, 'i');
        const italicsThoughtPattern = new RegExp(`(${marker}),?\\s+\\*([^*]+)\\*`, 'i');

        if (thoughtPattern.test(original) && italicsThoughtPattern.test(edited)) {
          return true;
        }
      }
      return false;
    },
    explanation: 'Added italics for internal thought/reflection.',
    rule: 'Use italics for internal thoughts without quotation marks.'
  }
];
