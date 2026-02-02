/**
 * =============================================================================
 * DOCUMENT UTILITY FUNCTIONS
 * =============================================================================
 *
 * Helper functions for document processing and analysis.
 * Used throughout the frontend for text manipulation, analysis, and formatting.
 *
 * FUNCTIONS:
 * ----------
 * - detectLanguage: Detect document language from text sample
 * - createChunks: Split document into processable chunks
 * - formatFileName: Add _EDITED suffix to filenames
 * - countWords: Count words in text
 * - countParagraphs: Count paragraphs in text
 * - formatFileSize: Format bytes as human-readable MB
 * - estimateProcessingTime: Calculate time estimate from chunk count
 *
 * CHUNKING STRATEGY:
 * ------------------
 * Documents are split into chunks of approximately CHUNK_SIZES.NEW_DOCUMENTS
 * words (default: 2000). Chunks are split at paragraph boundaries to maintain
 * context and avoid breaking sentences.
 *
 * WHY CHUNKING:
 * - Claude API has token limits (~200k context, ~4k output)
 * - Smaller chunks = faster response times
 * - Allows progress tracking and resume capability
 * - Enables incremental saving after each chunk
 *
 * LANGUAGE DETECTION:
 * -------------------
 * Simple heuristic based on common words in the first 1000 characters.
 * Currently supports: English, Spanish, French (with English as default).
 * This is a basic implementation - could be improved with more languages
 * or a proper language detection library.
 *
 * =============================================================================
 */

import { CHUNK_SIZES } from '../constants';

/**
 * Detect the primary language of text.
 *
 * Uses simple keyword matching for common function words.
 * Checks the first 1000 characters for language-specific patterns.
 *
 * @param {string} text - The text to analyze
 * @returns {string} Detected language name (e.g., "English", "Spanish")
 *
 * @example
 * detectLanguage("The quick brown fox jumps over the lazy dog")
 * // Returns: "English"
 */
export function detectLanguage(text) {
  // Take a sample from the beginning (converted to lowercase)
  const sample = text.substring(0, 1000).toLowerCase();

  // Check for common English function words
  if (/\b(the|and|is|in|to|of|a)\b/.test(sample)) return 'English';

  // Check for common Spanish function words
  if (/\b(el|la|de|y|en|los|las)\b/.test(sample)) return 'Spanish';

  // Check for common French function words
  if (/\b(le|la|de|et|en|les|un|une)\b/.test(sample)) return 'French';

  // Default to English if no clear match
  return 'English (assumed)';
}

/**
 * Split text paragraphs into chunks of approximately maxWordsPerChunk words.
 *
 * Chunks are created by accumulating paragraphs until the word count
 * exceeds the limit, then starting a new chunk. This respects paragraph
 * boundaries to maintain context and avoid breaking sentences.
 *
 * @param {Array<string>} paragraphs - Array of paragraph strings
 * @param {number} maxWordsPerChunk - Target words per chunk (default: 2000)
 * @returns {Array<string>} Array of chunk strings (paragraphs joined by \n\n)
 *
 * @example
 * const paragraphs = ["First paragraph...", "Second paragraph...", ...];
 * const chunks = createChunks(paragraphs, 2000);
 * // Returns: ["First paragraph...\n\nSecond paragraph...", ...]
 */
export function createChunks(paragraphs, maxWordsPerChunk = CHUNK_SIZES.NEW_DOCUMENTS) {
  const chunks = [];
  let currentChunk = [];      // Paragraphs in current chunk
  let currentWordCount = 0;   // Word count of current chunk

  for (const para of paragraphs) {
    // Count words in this paragraph
    const paraWordCount = para.split(/\s+/).length;

    // Check if adding this paragraph would exceed the limit
    if (currentWordCount + paraWordCount > maxWordsPerChunk && currentChunk.length > 0) {
      // Save current chunk and start a new one
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [para];
      currentWordCount = paraWordCount;
    } else {
      // Add paragraph to current chunk
      currentChunk.push(para);
      currentWordCount += paraWordCount;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks;
}

/**
 * Format a filename for the edited version.
 *
 * Replaces the .doc or .docx extension with _EDITED.docx
 * to clearly indicate this is the edited version.
 *
 * @param {string} fileName - Original file name
 * @returns {string} Formatted file name with _EDITED suffix
 *
 * @example
 * formatFileName("MyBook.docx")    // Returns: "MyBook_EDITED.docx"
 * formatFileName("MyBook.doc")     // Returns: "MyBook_EDITED.docx"
 */
export function formatFileName(fileName) {
  return fileName.replace(/\.(doc|docx)$/i, '_EDITED.docx');
}

/**
 * Count the number of words in text.
 *
 * Splits on whitespace and filters out empty strings
 * to handle multiple spaces and leading/trailing whitespace.
 *
 * @param {string} text - The text to count
 * @returns {number} Word count
 *
 * @example
 * countWords("The quick brown fox")  // Returns: 4
 */
export function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count the number of paragraphs in text.
 *
 * Splits on one or more newlines and filters out empty paragraphs.
 * A paragraph is defined as text between newline characters.
 *
 * @param {string} text - The text to count
 * @returns {number} Paragraph count
 *
 * @example
 * countParagraphs("First para.\n\nSecond para.\n\nThird para.")  // Returns: 3
 */
export function countParagraphs(text) {
  return text.split(/\n+/).filter(p => p.trim().length > 0).length;
}

/**
 * Format file size in bytes as megabytes.
 *
 * Converts bytes to MB with 2 decimal places.
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "1.25 MB")
 *
 * @example
 * formatFileSize(1310720)  // Returns: "1.25 MB"
 */
export function formatFileSize(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/**
 * Estimate processing time based on chunk count.
 *
 * Returns a time range based on the assumption that each chunk
 * takes approximately 1.5-2 minutes to process (including API latency,
 * Claude thinking time, and network overhead).
 *
 * @param {number} chunkCount - Number of chunks to process
 * @returns {string} Time estimate range (e.g., "15 - 20 minutes")
 *
 * @example
 * estimateProcessingTime(10)  // Returns: "15 - 20 minutes"
 */
export function estimateProcessingTime(chunkCount) {
  const minMinutes = Math.ceil(chunkCount * 1.5);
  const maxMinutes = Math.ceil(chunkCount * 2);
  return `${minMinutes} - ${maxMinutes} minutes`;
}
