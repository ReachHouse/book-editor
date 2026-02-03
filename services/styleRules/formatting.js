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
      // Look for multi-word phrases that got wrapped in asterisks

      // Find all italicized phrases in edited (asterisk-wrapped)
      const italicsMatches = edited.match(/\*([^*]+)\*/g) || [];

      for (const match of italicsMatches) {
        // Extract the text inside asterisks
        const title = match.slice(1, -1);

        // Skip single words (likely not titles) and very long phrases
        if (!title.includes(' ') || title.length > 100) continue;

        // Check if this text exists in original WITHOUT asterisks
        // and is now italicized in edited
        if (original.includes(title) && !original.includes(match)) {
          // Check if it looks like a title (starts with capital, has multiple words)
          if (/^[A-Z]/.test(title) && title.split(/\s+/).length >= 2) {
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
