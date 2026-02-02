/**
 * API Service
 * Handles all communication with the backend server
 */

import { API_BASE_URL, API_CONFIG } from '../constants';
import { formatFileName } from '../utils/documentUtils';

/**
 * Edit a chunk of text via the backend API
 * Includes retry logic for transient failures
 *
 * @param {string} text - The text to edit
 * @param {string} styleGuide - Document-specific style guide
 * @param {boolean} isFirst - Whether this is the first chunk
 * @param {function} logFn - Function to log progress messages
 * @param {number} retryCount - Current retry attempt (internal)
 * @returns {Promise<string>} The edited text
 */
export async function editChunk(text, styleGuide, isFirst, logFn, retryCount = 0) {
  logFn('Sending to server for editing...');

  try {
    const response = await fetch(`${API_BASE_URL}/api/edit-chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, styleGuide, isFirst })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server error');
    }

    const data = await response.json();
    return data.editedText;

  } catch (err) {
    logFn(`Error: ${err.message}`, 'error');

    if (retryCount < API_CONFIG.MAX_RETRIES) {
      const delay = API_CONFIG.RETRY_DELAY_BASE * (retryCount + 1);
      logFn(`Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/${API_CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return editChunk(text, styleGuide, isFirst, logFn, retryCount + 1);
    }

    throw err;
  }
}

/**
 * Generate a style guide from the first edited chunk
 *
 * @param {string} text - The first edited chunk
 * @param {function} logFn - Function to log progress messages
 * @returns {Promise<string>} A brief style guide
 */
export async function generateStyleGuide(text, logFn) {
  try {
    logFn('Generating style guide from first section...');

    const response = await fetch(`${API_BASE_URL}/api/generate-style-guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      return 'Professional, clear, and engaging style following Reach Publishers standards.';
    }

    const data = await response.json();
    return data.styleGuide;
  } catch (err) {
    return 'Professional, clear, and engaging style following Reach Publishers standards.';
  }
}

/**
 * Generate and download a Word document with Track Changes
 *
 * @param {Object} content - Document content
 * @param {string} content.original - Original text
 * @param {string} content.edited - Edited text
 * @param {string} content.fileName - Original file name
 * @returns {Promise<void>}
 */
export async function downloadDocument(content) {
  const response = await fetch(`${API_BASE_URL}/api/generate-docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalText: content.original,
      editedText: content.edited,
      fileName: formatFileName(content.fileName)
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Server failed to generate document');
  }

  const blob = await response.blob();

  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = formatFileName(content.fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check API status
 *
 * @returns {Promise<Object>} Status object with apiKeyConfigured flag
 */
export async function checkApiStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    return await response.json();
  } catch (err) {
    return { status: 'error', apiKeyConfigured: false };
  }
}
