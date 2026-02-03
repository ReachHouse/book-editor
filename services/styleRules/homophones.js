/**
 * Homophone Rules
 * Common confused words and homophone corrections
 */

module.exports = [
  {
    id: 'practice-practise',
    name: 'Practice vs Practise',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // UK English: practice (noun) vs practise (verb)
      // Detect when wrong form was corrected

      // Count verb contexts (after "to", "will", "must", "should", etc.)
      const verbContextPractice = /\b(to|will|must|should|can|could|would|might|may)\s+practice\b/gi;
      const verbContextPractise = /\b(to|will|must|should|can|could|would|might|may)\s+practise\b/gi;

      // Count noun contexts (after articles, possessives, or prepositions)
      const nounContextPractise = /\b(the|a|an|his|her|their|my|your|our|in|into|with|for|of|this|that)\s+practise\b/gi;
      const nounContextPractice = /\b(the|a|an|his|her|their|my|your|our|in|into|with|for|of|this|that)\s+practice\b/gi;

      const origVerbWrong = (original.match(verbContextPractice) || []).length;
      const editVerbCorrect = (edited.match(verbContextPractise) || []).length;
      const origNounWrong = (original.match(nounContextPractise) || []).length;
      const editNounCorrect = (edited.match(nounContextPractice) || []).length;

      // Verb corrected: practice → practise
      if (origVerbWrong > 0 && editVerbCorrect > 0 && editVerbCorrect >= origVerbWrong) {
        return true;
      }
      // Noun corrected: practise → practice
      if (origNounWrong > 0 && editNounCorrect > 0 && editNounCorrect >= origNounWrong) {
        return true;
      }
      return false;
    },
    explanation: 'Corrected practice/practise. UK English: practice (noun), practise (verb).',
    rule: 'practice (noun) vs practise (verb) in UK English'
  },
  {
    id: 'there-their-theyre',
    name: 'There/Their/They\'re',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const thereCount = (str) => (str.match(/\bthere\b/gi) || []).length;
      const theirCount = (str) => (str.match(/\btheir\b/gi) || []).length;
      const theyreCount = (str) => (str.match(/\bthey're\b/gi) || []).length;
      const origThere = thereCount(original);
      const origTheir = theirCount(original);
      const origTheyre = theyreCount(original);
      const editThere = thereCount(edited);
      const editTheir = theirCount(edited);
      const editTheyre = theyreCount(edited);
      // Check if any correction was made (distribution changed)
      // Removed total equality requirement to detect corrections that also add/remove words
      return (origThere !== editThere || origTheir !== editTheir || origTheyre !== editTheyre);
    },
    explanation: 'Corrected there/their/they\'re. there = location, their = possessive, they\'re = they are.',
    rule: 'there (location) vs their (possessive) vs they\'re (they are)'
  },
  {
    id: 'then-than',
    name: 'Then vs Than',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const thenCount = (str) => (str.match(/\bthen\b/gi) || []).length;
      const thanCount = (str) => (str.match(/\bthan\b/gi) || []).length;
      const origThen = thenCount(original);
      const origThan = thanCount(original);
      const editThen = thenCount(edited);
      const editThan = thanCount(edited);
      // Check if any correction was made (distribution changed)
      // Removed total equality requirement to detect corrections that also add/remove words
      return (origThen !== editThen || origThan !== editThan);
    },
    explanation: 'Corrected then/than. then = time/sequence, than = comparison.',
    rule: 'then (time/sequence) vs than (comparison)'
  },
  {
    id: 'too-to',
    name: 'Too vs To',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const tooCount = (str) => (str.match(/\btoo\b/gi) || []).length;
      const toCount = (str) => (str.match(/\bto\b/gi) || []).length;
      const origToo = tooCount(original);
      const origTo = toCount(original);
      const editToo = tooCount(edited);
      const editTo = toCount(edited);
      // Check if any correction was made (distribution changed)
      // Removed total equality requirement to detect corrections that also add/remove words
      return (origToo !== editToo || origTo !== editTo);
    },
    explanation: 'Corrected too/to. too = also or excessive, to = direction or infinitive.',
    rule: 'too (also/excessive) vs to (direction/infinitive)'
  }
];
