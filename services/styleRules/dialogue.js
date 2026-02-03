/**
 * Dialogue Rules
 * Formatting rules for direct speech and dialogue
 */

module.exports = [
  {
    id: 'dialogue-double-quotes',
    name: 'Dialogue Double Quotes',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect change from single to double quotes for dialogue
      // Use context-aware pattern to avoid matching apostrophes in contractions
      const singleQuotes = /(?:^|[\s(])'[^']+'(?:[\s,.!?;:)]|$)/;
      const doubleQuotes = /"[^"]+"/;
      const origHasSingle = singleQuotes.test(original);
      const editHasDouble = doubleQuotes.test(edited);
      return origHasSingle && editHasDouble && !doubleQuotes.test(original);
    },
    explanation: 'Changed to double quotes for dialogue per style guide.',
    rule: 'Use double quotes for dialogue'
  },
  {
    id: 'dialogue-comma',
    name: 'Dialogue Comma',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect addition of comma before dialogue tag
      // "Hello" he said → "Hello," he said
      // Pattern WITHOUT comma: quote ends with letter/word then quote mark (no comma)
      const withoutComma = /"[^"]+[a-zA-Z]"\s+(he|she|they|I|we|it)\s+(said|asked|replied|answered|whispered|shouted)/i;
      // Pattern WITH comma: quote ends with comma then quote mark
      const withComma = /"[^"]+,"\s+(he|she|they|I|we|it)\s+(said|asked|replied|answered|whispered|shouted)/i;

      // Original must have dialogue WITHOUT comma, edited must have dialogue WITH comma
      const origHasWithoutComma = withoutComma.test(original);
      const origHasWithComma = withComma.test(original);
      const editHasWithComma = withComma.test(edited);

      // Only detect if original lacked comma and edited has comma
      return origHasWithoutComma && !origHasWithComma && editHasWithComma;
    },
    explanation: 'Added comma inside closing quote before dialogue tag.',
    rule: 'Dialogue: comma before tag inside quotes - "Hello," she said'
  },
  {
    id: 'dialogue-new-speaker-line',
    name: 'New Speaker New Line',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect when different speakers' dialogue is moved to separate lines
      // "Hello," said John. "Hi," said Mary. → separated onto different lines
      const twoSpeakersOneLine = /"[^"]+"\s*,?\s*(said|asked|replied|answered|shouted|whispered|cried|exclaimed)\s+(\w+)\.\s*"[^"]+"\s*,?\s*(said|asked|replied|answered|shouted|whispered|cried|exclaimed)\s+(\w+)/i;

      if (twoSpeakersOneLine.test(original)) {
        // Check if edited has paragraph breaks (we use \n to detect in plain text)
        const origSpeakers = original.match(twoSpeakersOneLine);
        if (origSpeakers) {
          const speaker1 = origSpeakers[2].toLowerCase();
          const speaker2 = origSpeakers[4].toLowerCase();
          if (speaker1 !== speaker2) {
            // Different speakers - should be on different lines
            // Check if edited has them separated - verify NEW newlines were added
            const origNewlineCount = (original.match(/\n/g) || []).length;
            const editNewlineCount = (edited.match(/\n/g) || []).length;
            if (!twoSpeakersOneLine.test(edited) || editNewlineCount > origNewlineCount) {
              return true;
            }
          }
        }
      }

      // Pattern 2: Response dialogue immediately after without break
      // "Question?" "Answer." → should have line break
      const immediateResponse = /"[^"]+[?!]"\s*"[^"]+"[^"]*said/i;
      if (immediateResponse.test(original) && !immediateResponse.test(edited)) {
        return true;
      }

      // Pattern 3: Detect if newlines were added between dialogue segments
      const origDialogueCount = (original.match(/"\s*,?\s*(said|asked|replied)/gi) || []).length;
      const editDialogueCount = (edited.match(/"\s*,?\s*(said|asked|replied)/gi) || []).length;
      const origNewlines = (original.match(/\n/g) || []).length;
      const editNewlines = (edited.match(/\n/g) || []).length;

      // If same dialogue count but more newlines, line breaks were added
      if (origDialogueCount === editDialogueCount && origDialogueCount > 1 && editNewlines > origNewlines) {
        return true;
      }

      return false;
    },
    explanation: 'Added line break between different speakers per dialogue formatting rules.',
    rule: 'Direct dialogue: new speaker = new line'
  },
  {
    id: 'dialogue-speaker-continuation',
    name: 'Speaker Continuation Format',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect when same speaker's continued dialogue is properly formatted
      // Same speaker can continue on same line or new paragraph

      // Pattern: Dialogue interrupted by action, then continues
      // Wrong: "Hello," said John, "how are you?" (if John does action between)
      // Right: "Hello." John walked over. "How are you?"

      // Check for action between dialogue of same speaker being reformatted
      const interruptedDialogue = /"[^"]+"\s*(said|asked)\s+(\w+)[^"]+\.\s+"[^"]+"\s*(said|asked)\s+\2/i;

      if (interruptedDialogue.test(original) && !interruptedDialogue.test(edited)) {
        return true;
      }

      return false;
    },
    explanation: 'Reformatted speaker continuation for clarity.',
    rule: 'Direct dialogue: speaker continuation formatting'
  }
];
