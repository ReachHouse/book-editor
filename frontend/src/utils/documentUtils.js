/**
 * Document Utility Functions
 * Helper functions for document processing
 */

import { CHUNK_SIZES } from '../constants';

/**
 * Detect the primary language of text
 * Uses simple keyword matching for common languages
 */
export function detectLanguage(text) {
  const sample = text.substring(0, 1000).toLowerCase();

  if (/\b(the|and|is|in|to|of|a)\b/.test(sample)) return 'English';
  if (/\b(el|la|de|y|en|los|las)\b/.test(sample)) return 'Spanish';
  if (/\b(le|la|de|et|en|les|un|une)\b/.test(sample)) return 'French';

  return 'English (assumed)';
}

/**
 * Split text into chunks of approximately maxWordsPerChunk words
 * Respects paragraph boundaries to maintain context
 */
export function createChunks(paragraphs, maxWordsPerChunk = CHUNK_SIZES.NEW_DOCUMENTS) {
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const paraWordCount = para.split(/\s+/).length;

    if (currentWordCount + paraWordCount > maxWordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [para];
      currentWordCount = paraWordCount;
    } else {
      currentChunk.push(para);
      currentWordCount += paraWordCount;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks;
}

/**
 * Format a file name for the edited version
 * Adds _EDITED suffix before the extension
 */
export function formatFileName(fileName) {
  return fileName.replace(/\.(doc|docx)$/i, '_EDITED.docx');
}

/**
 * Parse word count from text
 */
export function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Parse paragraph count from text
 */
export function countParagraphs(text) {
  return text.split(/\n+/).filter(p => p.trim().length > 0).length;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/**
 * Estimate processing time based on chunk count
 * Returns a range string like "15 - 20 minutes"
 */
export function estimateProcessingTime(chunkCount) {
  const minMinutes = Math.ceil(chunkCount * 1.5);
  const maxMinutes = Math.ceil(chunkCount * 2);
  return `${minMinutes} - ${maxMinutes} minutes`;
}
