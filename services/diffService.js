/**
 * Diff Service
 * Implements LCS-based diffing for accurate Track Changes generation
 *
 * Key improvement: Uses paragraph-level alignment before word-level diff
 * to handle cases where Claude merges or splits paragraphs
 */

// ============================================================================
// TOKENIZATION
// ============================================================================

/**
 * Split text into word and whitespace tokens
 */
function tokenize(text) {
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

/**
 * Normalize paragraph for comparison (trim, collapse whitespace)
 */
function normalizeParagraph(para) {
  return para.trim().replace(/\s+/g, ' ');
}

// ============================================================================
// LCS ALGORITHMS
// ============================================================================

/**
 * Compute Longest Common Subsequence with position tracking
 * Used for both paragraph-level and word-level alignment
 */
function computeLCS(arr1, arr2, compareFn = (a, b) => a === b) {
  const m = arr1.length;
  const n = arr2.length;

  // For very large arrays, use memory-efficient approach
  if (m * n > 5000000) {
    return computeLCSOptimized(arr1, arr2, compareFn);
  }

  // Create DP table
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (compareFn(arr1[i - 1], arr2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS with indices
  const lcs = [];
  let i = m, j = n;

  while (i > 0 && j > 0) {
    if (compareFn(arr1[i - 1], arr2[j - 1])) {
      lcs.unshift({ origIndex: i - 1, editIndex: j - 1, value: arr1[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Memory-optimized LCS for very large inputs
 * Uses greedy matching approach
 */
function computeLCSOptimized(arr1, arr2, compareFn = (a, b) => a === b) {
  const m = arr1.length;
  const n = arr2.length;

  const lcs = [];
  let i = 0, j = 0;

  while (i < m && j < n) {
    if (compareFn(arr1[i], arr2[j])) {
      lcs.push({ origIndex: i, editIndex: j, value: arr1[i] });
      i++;
      j++;
    } else {
      // Find next potential match
      let foundInOrig = -1;
      let foundInEdit = -1;

      // Look ahead limited distance to avoid O(n²)
      const lookAhead = Math.min(100, Math.max(m - i, n - j));

      for (let k = 1; k < lookAhead; k++) {
        if (foundInOrig === -1 && i + k < m && compareFn(arr1[i + k], arr2[j])) {
          foundInOrig = i + k;
        }
        if (foundInEdit === -1 && j + k < n && compareFn(arr1[i], arr2[j + k])) {
          foundInEdit = j + k;
        }
        if (foundInOrig !== -1 && foundInEdit !== -1) break;
      }

      if (foundInOrig === -1) foundInOrig = m;
      if (foundInEdit === -1) foundInEdit = n;

      // Choose direction that skips fewer elements
      if (foundInOrig - i <= foundInEdit - j) {
        i++;
      } else {
        j++;
      }
    }
  }

  return lcs;
}

// ============================================================================
// PARAGRAPH-LEVEL ALIGNMENT (KEY FIX)
// ============================================================================

/**
 * Align paragraphs between original and edited text
 * This handles cases where Claude merges or splits paragraphs
 *
 * Returns array of aligned paragraph pairs:
 * { original: string | null, edited: string | null, type: 'match' | 'delete' | 'insert' | 'change' }
 */
function alignParagraphs(originalParas, editedParas) {
  // Normalize for comparison
  const normalizedOrig = originalParas.map(normalizeParagraph);
  const normalizedEdit = editedParas.map(normalizeParagraph);

  // Find LCS of paragraphs using similarity threshold
  // Using Jaccard similarity, 0.5 threshold catches paragraphs with moderate edits
  const lcs = computeLCS(normalizedOrig, normalizedEdit, (a, b) => {
    if (a === b) return true;
    return calculateSimilarity(a, b) > 0.5;
  });

  const aligned = [];
  let origIndex = 0;
  let editIndex = 0;

  for (const match of lcs) {
    // Handle deletions before this match
    while (origIndex < match.origIndex) {
      aligned.push({
        original: originalParas[origIndex],
        edited: null,
        type: 'delete'
      });
      origIndex++;
    }

    // Handle insertions before this match
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

  // Handle remaining deletions
  while (origIndex < originalParas.length) {
    aligned.push({
      original: originalParas[origIndex],
      edited: null,
      type: 'delete'
    });
    origIndex++;
  }

  // Handle remaining insertions
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

/**
 * Normalize a word for comparison (lowercase, remove punctuation)
 */
function normalizeWord(word) {
  return word.toLowerCase().replace(/[^\w]/g, '');
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * Uses word-level comparison with normalization
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const len1 = str1.length;
  const len2 = str2.length;

  // Quick length check - if lengths differ significantly, similarity is low
  const lengthRatio = Math.min(len1, len2) / Math.max(len1, len2);
  if (lengthRatio < 0.3) return lengthRatio * 0.3;

  // Normalize words for comparison (remove punctuation, lowercase)
  const words1 = str1.split(/\s+/).map(normalizeWord).filter(w => w.length > 0);
  const words2Set = new Set(str2.split(/\s+/).map(normalizeWord).filter(w => w.length > 0));

  let commonWords = 0;
  for (const word of words1) {
    if (words2Set.has(word)) commonWords++;
  }

  // Jaccard-like similarity
  const totalUniqueWords = new Set([...words1, ...words2Set]).size;
  if (totalUniqueWords === 0) return 0;

  return commonWords / totalUniqueWords;
}

// ============================================================================
// WORD-LEVEL DIFF
// ============================================================================

/**
 * Compute word-level diff between two strings
 * Returns array of changes: { type: 'equal' | 'delete' | 'insert', text: string }
 */
function computeWordDiff(original, edited) {
  const originalTokens = tokenize(original);
  const editedTokens = tokenize(edited);

  const lcs = computeLCS(originalTokens, editedTokens);

  const changes = [];
  let origIndex = 0;
  let editIndex = 0;
  let lcsIndex = 0;

  while (origIndex < originalTokens.length || editIndex < editedTokens.length) {
    if (lcsIndex < lcs.length) {
      const lcsItem = lcs[lcsIndex];

      // Collect deletions and insertions before this LCS point
      const deletions = [];
      const insertions = [];

      while (origIndex < lcsItem.origIndex) {
        deletions.push(originalTokens[origIndex]);
        origIndex++;
      }

      while (editIndex < lcsItem.editIndex) {
        insertions.push(editedTokens[editIndex]);
        editIndex++;
      }

      // Add deletions first, then insertions (shows as replacement in Word)
      if (deletions.length > 0) {
        changes.push({ type: 'delete', text: deletions.join('') });
      }
      if (insertions.length > 0) {
        changes.push({ type: 'insert', text: insertions.join('') });
      }

      // Add the matching token
      changes.push({ type: 'equal', text: originalTokens[origIndex] });
      origIndex++;
      editIndex++;
      lcsIndex++;
    } else {
      // No more LCS items - remaining are deletions/insertions
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

  return mergeConsecutiveChanges(changes);
}

/**
 * Merge consecutive changes of the same type for cleaner output
 */
function mergeConsecutiveChanges(changes) {
  if (changes.length === 0) return changes;

  const merged = [];
  let current = { ...changes[0] };

  for (let i = 1; i < changes.length; i++) {
    if (changes[i].type === current.type) {
      current.text += changes[i].text;
    } else {
      merged.push(current);
      current = { ...changes[i] };
    }
  }
  merged.push(current);

  return merged;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  tokenize,
  computeLCS,
  computeLCSOptimized,
  computeWordDiff,
  alignParagraphs,
  calculateSimilarity,
  mergeConsecutiveChanges
};
