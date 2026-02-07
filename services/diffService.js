/**
 * =============================================================================
 * DIFF SERVICE - LCS-Based Change Tracking
 * =============================================================================
 *
 * This service implements the core diffing algorithms used to generate
 * Microsoft Word Track Changes. It compares original and edited text to
 * identify insertions, deletions, and unchanged content.
 *
 * ALGORITHM OVERVIEW:
 * -------------------
 * The diff process uses a two-phase approach:
 *
 *   Phase 1: PARAGRAPH ALIGNMENT (alignParagraphs)
 *   - Aligns paragraphs between original and edited text using LCS
 *   - Uses similarity scoring to match paragraphs even when edited
 *   - Handles cases where Claude AI merges, splits, or reorders paragraphs
 *   - Critical fix: Without this, word-level diff would misalign completely
 *
 *   Phase 2: WORD-LEVEL DIFF (computeWordDiff)
 *   - Within each aligned paragraph pair, computes word-level changes
 *   - Preserves whitespace for accurate reconstruction
 *   - Produces changes array: { type: 'equal'|'delete'|'insert', text }
 *
 * LCS (LONGEST COMMON SUBSEQUENCE):
 * ---------------------------------
 * The LCS algorithm finds the longest sequence of elements that appear in
 * the same order in both arrays. This is the foundation for diff algorithms.
 *
 *   Example: Original = "The quick brown fox"
 *            Edited   = "The fast brown dog"
 *            LCS      = "The brown" (common subsequence)
 *            Result   = "The" [delete "quick"][insert "fast"] "brown" [delete "fox"][insert "dog"]
 *
 * MEMORY OPTIMIZATION:
 * --------------------
 * For very large documents (>5M token pairs), we use a greedy approximation
 * instead of the O(n²) space dynamic programming approach. This trades
 * perfect accuracy for memory efficiency.
 *
 * SIMILARITY SCORING:
 * -------------------
 * Paragraphs are matched using Jaccard similarity with word normalization.
 * Threshold of 0.5 means paragraphs must share at least 50% of their words
 * to be considered the "same" paragraph (just edited, not replaced).
 *
 * EXPORTS:
 * --------
 * - computeWordDiff: Word-level diff within a paragraph
 * - alignParagraphs: Paragraph-level alignment
 *
 * Internal functions (not exported):
 * - tokenize: Split text into words and whitespace
 * - computeLCS: Standard LCS with DP
 * - computeLCSOptimized: Memory-efficient LCS approximation
 * - calculateSimilarity: Jaccard similarity for paragraph matching
 * - mergeConsecutiveChanges: Clean up adjacent same-type changes
 *
 * USAGE IN DOCUMENT GENERATION:
 * -----------------------------
 * This service is called by documentService.js when generating Word documents.
 * The changes array is converted to Word Track Changes (InsertedTextRun,
 * DeletedTextRun) for native change tracking support.
 *
 * =============================================================================
 */

// =============================================================================
// TOKENIZATION
// =============================================================================

/**
 * Split text into word and whitespace tokens.
 *
 * Uses regex to capture both words and whitespace as separate tokens.
 * This preserves the exact spacing for accurate document reconstruction.
 *
 * @param {string} text - Input text to tokenize
 * @returns {string[]} Array of tokens (words and whitespace)
 *
 * @example
 * tokenize("Hello  world") => ["Hello", "  ", "world"]
 */
function tokenize(text) {
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

/**
 * Normalize a paragraph for comparison.
 *
 * Trims whitespace and collapses multiple spaces to single space.
 * Used when comparing paragraphs for similarity scoring.
 *
 * @param {string} para - Paragraph text
 * @returns {string} Normalized paragraph
 */
function normalizeParagraph(para) {
  return para.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize a word for similarity comparison.
 *
 * Converts to lowercase and removes punctuation.
 * Ensures "Hello," and "hello" are treated as the same word.
 *
 * @param {string} word - Word to normalize
 * @returns {string} Normalized word
 */
function normalizeWord(word) {
  return word.toLowerCase().replace(/[^\w]/g, '');
}

// =============================================================================
// LCS (LONGEST COMMON SUBSEQUENCE) ALGORITHMS
// =============================================================================

/**
 * Compute Longest Common Subsequence with position tracking.
 *
 * This is the core algorithm for diff computation. It finds the longest
 * sequence of elements that appear in the same order in both arrays.
 *
 * Algorithm: Dynamic Programming with O(mn) time and space complexity.
 * For arrays larger than 5M elements, falls back to optimized version.
 *
 * @param {Array} arr1 - First array (original)
 * @param {Array} arr2 - Second array (edited)
 * @param {Function} compareFn - Comparison function, defaults to strict equality
 * @returns {Array} LCS with position indices: [{ origIndex, editIndex, value }]
 *
 * @example
 * computeLCS(['a','b','c'], ['a','c','d'])
 * => [{ origIndex: 0, editIndex: 0, value: 'a' },
 *     { origIndex: 2, editIndex: 1, value: 'c' }]
 */
function computeLCS(arr1, arr2, compareFn = (a, b) => a === b) {
  const m = arr1.length;
  const n = arr2.length;

  // Memory threshold: 5 million cells
  // Beyond this, DP table becomes too large (~40MB for numbers)
  if (m * n > 5000000) {
    return computeLCSOptimized(arr1, arr2, compareFn);
  }

  // Build DP table
  // dp[i][j] = length of LCS for arr1[0..i-1] and arr2[0..j-1]
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Fill DP table using recurrence relation:
  // If elements match: dp[i][j] = dp[i-1][j-1] + 1
  // Otherwise: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (compareFn(arr1[i - 1], arr2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find actual LCS elements with their positions
  // Start from bottom-right and trace back to top-left
  const lcs = [];
  let i = m, j = n;

  while (i > 0 && j > 0) {
    if (compareFn(arr1[i - 1], arr2[j - 1])) {
      // Match found - add to LCS and move diagonally
      lcs.unshift({ origIndex: i - 1, editIndex: j - 1, value: arr1[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      // Came from above - element deleted from original
      i--;
    } else {
      // Came from left - element inserted in edited
      j--;
    }
  }

  return lcs;
}

/**
 * Memory-optimized LCS for very large inputs.
 *
 * Uses a greedy matching approach instead of full DP.
 * Trades perfect accuracy for O(n) space complexity.
 *
 * The algorithm looks ahead a limited distance (100 elements) to find
 * matches, avoiding O(n²) comparisons while still producing good results.
 *
 * @param {Array} arr1 - First array (original)
 * @param {Array} arr2 - Second array (edited)
 * @param {Function} compareFn - Comparison function
 * @returns {Array} Approximate LCS with position indices
 */
function computeLCSOptimized(arr1, arr2, compareFn = (a, b) => a === b) {
  const m = arr1.length;
  const n = arr2.length;

  const lcs = [];
  let i = 0, j = 0;

  while (i < m && j < n) {
    if (compareFn(arr1[i], arr2[j])) {
      // Direct match - add to LCS
      lcs.push({ origIndex: i, editIndex: j, value: arr1[i] });
      i++;
      j++;
    } else {
      // No direct match - look ahead to find next match
      let foundInOrig = -1;
      let foundInEdit = -1;

      // Limit look-ahead to 100 elements to avoid O(n²)
      const lookAhead = Math.min(100, Math.max(m - i, n - j));

      for (let k = 1; k < lookAhead; k++) {
        // Check if skipping k elements in original finds a match
        if (foundInOrig === -1 && i + k < m && compareFn(arr1[i + k], arr2[j])) {
          foundInOrig = i + k;
        }
        // Check if skipping k elements in edited finds a match
        if (foundInEdit === -1 && j + k < n && compareFn(arr1[i], arr2[j + k])) {
          foundInEdit = j + k;
        }
        if (foundInOrig !== -1 && foundInEdit !== -1) break;
      }

      // Default to end if no match found
      if (foundInOrig === -1) foundInOrig = m;
      if (foundInEdit === -1) foundInEdit = n;

      // Greedily choose path that skips fewer elements
      if (foundInOrig - i <= foundInEdit - j) {
        i++; // Skip element in original (deletion)
      } else {
        j++; // Skip element in edited (insertion)
      }
    }
  }

  return lcs;
}

// =============================================================================
// PARAGRAPH-LEVEL ALIGNMENT
// =============================================================================
// This is the KEY FIX for accurate Track Changes generation.
// Without paragraph alignment, word-level diff would produce nonsensical
// results when paragraphs are added, removed, or reordered.

/**
 * Calculate Jaccard similarity between two strings.
 *
 * Uses word-level comparison with normalization (lowercase, no punctuation).
 * Returns a value between 0 (completely different) and 1 (identical).
 *
 * Formula: |Intersection| / |Union|
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio (0-1)
 *
 * @example
 * calculateSimilarity("The quick fox", "The fast fox") => ~0.5
 * calculateSimilarity("Hello world", "Hello world") => 1.0
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const len1 = str1.length;
  const len2 = str2.length;

  // Quick rejection: if length ratio is very different, low similarity
  const lengthRatio = Math.min(len1, len2) / Math.max(len1, len2);
  if (lengthRatio < 0.3) return lengthRatio * 0.3;

  // Tokenize and normalize words into sets (deduplicated for correct Jaccard)
  const words1Set = new Set(str1.split(/\s+/).map(normalizeWord).filter(w => w.length > 0));
  const words2Set = new Set(str2.split(/\s+/).map(normalizeWord).filter(w => w.length > 0));

  // Count words in common (intersection of two sets)
  let commonWords = 0;
  for (const word of words1Set) {
    if (words2Set.has(word)) commonWords++;
  }

  // Jaccard similarity: |intersection| / |union|
  const totalUniqueWords = new Set([...words1Set, ...words2Set]).size;
  if (totalUniqueWords === 0) return 0;

  return commonWords / totalUniqueWords;
}

/**
 * Align paragraphs between original and edited text.
 *
 * This is crucial for handling cases where Claude AI:
 * - Merges multiple paragraphs into one
 * - Splits one paragraph into multiple
 * - Adds new paragraphs
 * - Removes paragraphs
 * - Reorders paragraphs
 *
 * Without this alignment, the word-level diff would compare the wrong
 * paragraphs, producing Track Changes that make no sense.
 *
 * @param {string[]} originalParas - Array of original paragraphs
 * @param {string[]} editedParas - Array of edited paragraphs
 * @returns {Array} Aligned pairs: { original, edited, type }
 *
 * Types:
 * - 'match': Paragraphs are identical
 * - 'change': Same paragraph with edits (needs word-level diff)
 * - 'delete': Paragraph removed (exists in original only)
 * - 'insert': Paragraph added (exists in edited only)
 */
function alignParagraphs(originalParas, editedParas) {
  // Handle null/undefined inputs
  if (!originalParas || !Array.isArray(originalParas)) {
    originalParas = [];
  }
  if (!editedParas || !Array.isArray(editedParas)) {
    editedParas = [];
  }

  // Handle empty arrays
  if (originalParas.length === 0 && editedParas.length === 0) {
    return [];
  }
  if (originalParas.length === 0) {
    return editedParas.map(p => ({ original: null, edited: p, type: 'insert' }));
  }
  if (editedParas.length === 0) {
    return originalParas.map(p => ({ original: p, edited: null, type: 'delete' }));
  }

  // Normalize paragraphs for comparison
  const normalizedOrig = originalParas.map(normalizeParagraph);
  const normalizedEdit = editedParas.map(normalizeParagraph);

  // Find LCS of paragraphs using similarity-based matching
  // Threshold of 0.5 means >50% word overlap = same paragraph (edited)
  const lcs = computeLCS(normalizedOrig, normalizedEdit, (a, b) => {
    if (a === b) return true;
    return calculateSimilarity(a, b) > 0.5;
  });

  const aligned = [];
  let origIndex = 0;
  let editIndex = 0;

  // Walk through LCS matches and fill in deletions/insertions
  for (const match of lcs) {
    // Any original paragraphs before this match are deletions
    while (origIndex < match.origIndex) {
      aligned.push({
        original: originalParas[origIndex],
        edited: null,
        type: 'delete'
      });
      origIndex++;
    }

    // Any edited paragraphs before this match are insertions
    while (editIndex < match.editIndex) {
      aligned.push({
        original: null,
        edited: editedParas[editIndex],
        type: 'insert'
      });
      editIndex++;
    }

    // Add the matched pair
    const origPara = originalParas[origIndex];
    const editPara = editedParas[editIndex];

    aligned.push({
      original: origPara,
      edited: editPara,
      type: origPara === editPara ? 'match' : 'change'
    });

    origIndex++;
    editIndex++;
  }

  // Handle any remaining paragraphs after last match
  while (origIndex < originalParas.length) {
    aligned.push({
      original: originalParas[origIndex],
      edited: null,
      type: 'delete'
    });
    origIndex++;
  }

  while (editIndex < editedParas.length) {
    aligned.push({
      original: null,
      edited: editedParas[editIndex],
      type: 'insert'
    });
    editIndex++;
  }

  return aligned;
}

// =============================================================================
// WORD-LEVEL DIFF
// =============================================================================

/**
 * Compute word-level diff between two strings.
 *
 * Called for each paragraph pair where type='change'.
 * Produces fine-grained changes that map directly to Word Track Changes.
 *
 * @param {string} original - Original paragraph text
 * @param {string} edited - Edited paragraph text
 * @returns {Array} Changes: [{ type: 'equal'|'delete'|'insert', text }]
 *
 * @example
 * computeWordDiff("The quick fox", "The fast fox")
 * => [{ type: 'equal', text: 'The ' },
 *     { type: 'delete', text: 'quick' },
 *     { type: 'insert', text: 'fast' },
 *     { type: 'equal', text: ' fox' }]
 */
function computeWordDiff(original, edited) {
  // Handle null/undefined inputs
  if (!original && !edited) {
    return [];
  }
  if (!original) {
    return [{ type: 'insert', text: edited }];
  }
  if (!edited) {
    return [{ type: 'delete', text: original }];
  }

  // Ensure inputs are strings
  original = String(original);
  edited = String(edited);

  // Handle identical strings
  if (original === edited) {
    return [{ type: 'equal', text: original }];
  }

  const originalTokens = tokenize(original);
  const editedTokens = tokenize(edited);

  // Get LCS of tokens
  const lcs = computeLCS(originalTokens, editedTokens);

  const changes = [];
  let origIndex = 0;
  let editIndex = 0;
  let lcsIndex = 0;

  // Walk through both token arrays, using LCS as anchor points
  while (origIndex < originalTokens.length || editIndex < editedTokens.length) {
    if (lcsIndex < lcs.length) {
      const lcsItem = lcs[lcsIndex];

      // Collect deletions (tokens in original before LCS point)
      const deletions = [];
      while (origIndex < lcsItem.origIndex) {
        deletions.push(originalTokens[origIndex]);
        origIndex++;
      }

      // Collect insertions (tokens in edited before LCS point)
      const insertions = [];
      while (editIndex < lcsItem.editIndex) {
        insertions.push(editedTokens[editIndex]);
        editIndex++;
      }

      // Add deletions first, then insertions
      // This order shows replacements correctly in Word Track Changes
      if (deletions.length > 0) {
        changes.push({ type: 'delete', text: deletions.join('') });
      }
      if (insertions.length > 0) {
        changes.push({ type: 'insert', text: insertions.join('') });
      }

      // Add the matching token (unchanged)
      changes.push({ type: 'equal', text: originalTokens[origIndex] });
      origIndex++;
      editIndex++;
      lcsIndex++;
    } else {
      // No more LCS items - everything remaining is a change
      const deletions = [];
      const insertions = [];

      while (origIndex < originalTokens.length) {
        deletions.push(originalTokens[origIndex]);
        origIndex++;
      }
      while (editIndex < editedTokens.length) {
        insertions.push(editedTokens[editIndex]);
        editIndex++;
      }

      if (deletions.length > 0) {
        changes.push({ type: 'delete', text: deletions.join('') });
      }
      if (insertions.length > 0) {
        changes.push({ type: 'insert', text: insertions.join('') });
      }
    }
  }

  // Merge adjacent changes of the same type for cleaner output
  return mergeConsecutiveChanges(changes);
}

/**
 * Merge consecutive changes of the same type.
 *
 * Combines adjacent delete/delete or insert/insert into single entries.
 * Also merges small adjacent delete+insert pairs where only punctuation
 * or minor formatting differs.
 *
 * @param {Array} changes - Array of changes
 * @returns {Array} Merged changes
 *
 * @example
 * [{ type: 'delete', text: 'a' }, { type: 'delete', text: 'b' }]
 * => [{ type: 'delete', text: 'ab' }]
 */
function mergeConsecutiveChanges(changes) {
  if (changes.length === 0) return changes;

  // First pass: merge same-type consecutive changes
  const firstPass = [];
  let current = { ...changes[0] };

  for (let i = 1; i < changes.length; i++) {
    if (changes[i].type === current.type) {
      // Same type - concatenate text
      current.text += changes[i].text;
    } else {
      // Different type - push current and start new
      firstPass.push(current);
      current = { ...changes[i] };
    }
  }
  firstPass.push(current);

  // Second pass: merge small delete+insert pairs that are essentially the same word
  // This reduces noise from punctuation/case changes like "Why" -> "Why."
  const secondPass = [];

  for (let i = 0; i < firstPass.length; i++) {
    const change = firstPass[i];
    const nextChange = firstPass[i + 1];

    // Check if this is a delete followed by insert (or vice versa)
    if (nextChange &&
        ((change.type === 'delete' && nextChange.type === 'insert') ||
         (change.type === 'insert' && nextChange.type === 'delete'))) {

      const text1 = change.text.trim().toLowerCase().replace(/[^\w\s]/g, '');
      const text2 = nextChange.text.trim().toLowerCase().replace(/[^\w\s]/g, '');

      // If normalized text is identical, it's just punctuation/case change
      // Keep as separate changes but they'll be displayed together
      if (text1 === text2 && text1.length > 0) {
        // Keep both changes but ensure they stay together
        secondPass.push(change);
        secondPass.push(nextChange);
        i++; // Skip next change as we processed it
        continue;
      }
    }

    secondPass.push(change);
  }

  return secondPass;
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

// Only export functions needed by documentService.js
// Internal functions (tokenize, computeLCS, etc.) are kept private
module.exports = {
  // Primary diff functions used by documentService
  computeWordDiff,
  alignParagraphs
};
