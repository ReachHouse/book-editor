/**
 * Concord (Agreement) Rules
 * Subject-verb agreement and pronoun consistency
 */

module.exports = [
  {
    id: 'concord-pronoun-shift',
    name: 'Pronoun Consistency',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect correction of pronoun shifts
      // e.g., "When one is challenged, we tend to react" → "When one is challenged, one tends to react"
      // or "One should do their best" → "One should do one's best"

      // Pattern: "one" followed later by "we/our/us" or "you/your" (inconsistent)
      const oneWithWe = /\bone\b[^.!?]*\b(we|our|us)\b/i;
      const oneWithYou = /\bone\b[^.!?]*\b(you|your)\b/i;

      // Check for consistency in edited: "one" followed by "one's" or another "one"
      const oneWithOnes = /\bone\b[^.!?]*\bone's\b/i;
      const multipleOnes = /\bone\b[^.!?]*\bone\b/i; // "one" appears twice in same sentence

      // Count "one" occurrences to detect increase in consistency
      const countOne = (str) => (str.match(/\bone\b/gi) || []).length;
      const origOneCount = countOne(original);
      const editOneCount = countOne(edited);

      // If original has inconsistent pronouns (one + we/you)
      const origInconsistent = oneWithWe.test(original) || oneWithYou.test(original);

      // And edited has consistent "one" usage (one's, or more "one" occurrences)
      const editConsistent = oneWithOnes.test(edited) || multipleOnes.test(edited) || editOneCount > origOneCount;

      if (origInconsistent && editConsistent) {
        return true;
      }

      return false;
    },
    explanation: 'Corrected pronoun consistency (avoiding shifts between one/you/we).',
    rule: 'Maintain pronoun consistency: if starting with "one", continue with "one/one\'s".'
  },
  {
    id: 'concord-subject-verb',
    name: 'Subject-Verb Agreement',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect common subject-verb agreement corrections

      // Common errors: "they was" → "they were", "he don't" → "he doesn't"
      const commonErrors = [
        { wrong: /\bthey\s+was\b/i, right: /\bthey\s+were\b/i },
        { wrong: /\bwe\s+was\b/i, right: /\bwe\s+were\b/i },
        { wrong: /\byou\s+was\b/i, right: /\byou\s+were\b/i },
        { wrong: /\bhe\s+don't\b/i, right: /\bhe\s+doesn't\b/i },
        { wrong: /\bshe\s+don't\b/i, right: /\bshe\s+doesn't\b/i },
        { wrong: /\bit\s+don't\b/i, right: /\bit\s+doesn't\b/i },
        { wrong: /\beveryone\s+are\b/i, right: /\beveryone\s+is\b/i },
        { wrong: /\beverybody\s+are\b/i, right: /\beverybody\s+is\b/i },
        { wrong: /\bno one\s+are\b/i, right: /\bno one\s+is\b/i },
        { wrong: /\bnobody\s+are\b/i, right: /\bnobody\s+is\b/i },
        { wrong: /\beach\s+are\b/i, right: /\beach\s+is\b/i }
      ];

      for (const { wrong, right } of commonErrors) {
        if (wrong.test(original) && right.test(edited)) {
          return true;
        }
      }

      return false;
    },
    explanation: 'Corrected subject-verb agreement.',
    rule: 'Subject-verb agreement: "they were" not "they was", "he doesn\'t" not "he don\'t".'
  },
  {
    id: 'concord-neither-nor',
    name: 'Neither/Nor Agreement',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Neither/nor agreement: verb agrees with nearest subject
      // "Neither the cat nor the dogs is" → "Neither the cat nor the dogs are"
      // "Neither the dogs nor the cat are" → "Neither the dogs nor the cat is"

      // This is complex - we just detect if neither/nor + verb pattern changed
      const neitherNorPattern = /\bneither\b[^.!?]*\bnor\b[^.!?]*\b(is|are|was|were|has|have)\b/i;

      if (neitherNorPattern.test(original) && neitherNorPattern.test(edited)) {
        const origMatch = original.match(neitherNorPattern);
        const editMatch = edited.match(neitherNorPattern);

        if (origMatch && editMatch && origMatch[1].toLowerCase() !== editMatch[1].toLowerCase()) {
          return true;
        }
      }

      return false;
    },
    explanation: 'Corrected neither/nor verb agreement (verb matches nearest subject).',
    rule: 'Neither/nor: verb agrees with nearest subject - "Neither the dogs nor the cat is..."'
  }
];
