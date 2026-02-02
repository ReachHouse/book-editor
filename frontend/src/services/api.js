/**
 * =============================================================================
 * API SERVICE
 * =============================================================================
 *
 * Handles all HTTP communication with the backend server.
 * Provides functions for editing text, generating style guides, and
 * downloading Word documents.
 *
 * API ENDPOINTS:
 * --------------
 * POST /api/edit-chunk         - Send text to Claude for editing
 * POST /api/generate-style-guide - Generate consistency guide from first chunk
 * POST /api/generate-docx      - Create Word document with Track Changes
 * GET  /api/status             - Check API configuration status
 *
 * RETRY LOGIC:
 * ------------
 * The editChunk function includes automatic retry with exponential backoff.
 * This handles transient failures (network issues, server overload) without
 * immediately failing the entire editing session.
 *
 * Retry behavior:
 * - Attempt 1 fails: Wait 2 seconds, retry
 * - Attempt 2 fails: Wait 4 seconds, retry
 * - Attempt 3 fails: Wait 6 seconds, retry
 * - All retries fail: Throw error, let caller handle
 *
 * ERROR HANDLING:
 * ---------------
 * All functions throw errors on failure (after retries, where applicable).
 * Callers should wrap in try/catch and display appropriate error messages.
 *
 * Exception: generateStyleGuide fails silently and returns a default guide,
 * since it's not critical to the editing process.
 *
 * USAGE:
 * ------
 * import { editChunk, generateStyleGuide, downloadDocument } from './services/api';
 *
 * // Edit a chunk of text
 * const editedText = await editChunk(text, styleGuide, isFirst, logFn);
 *
 * // Generate style guide from first chunk
 * const guide = await generateStyleGuide(editedText, logFn);
 *
 * // Download the final document
 * await downloadDocument({ original, edited, fileName });
 *
 * =============================================================================
 */

import { API_BASE_URL, API_CONFIG } from '../constants';
import { formatFileName } from '../utils/documentUtils';

/**
 * Edit a chunk of text via the Claude AI backend.
 *
 * Sends the text to the server, which forwards it to Claude for editing
 * according to the Reach Publishers House Style Guide.
 *
 * Includes automatic retry logic for transient failures.
 *
 * @param {string} text - The text chunk to edit (~2000 words)
 * @param {string} styleGuide - Document-specific style guide for consistency
 * @param {boolean} isFirst - True if this is the first chunk (no prior context)
 * @param {function} logFn - Logging function: logFn(message, type='info')
 * @param {number} retryCount - Internal: current retry attempt number
 * @returns {Promise<string>} The edited text
 * @throws {Error} If all retry attempts fail
 */
export async function editChunk(text, styleGuide, isFirst, logFn, retryCount = 0) {
  logFn('Sending to server for editing...');

  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/edit-chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, styleGuide, isFirst })
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server error');
    }

    // Parse and return the edited text
    const data = await response.json();
    return data.editedText;

  } catch (err) {
    // Log the error
    logFn(`Error: ${err.message}`, 'error');

    // Retry if we haven't exceeded the limit
    if (retryCount < API_CONFIG.MAX_RETRIES) {
      // Calculate delay with linear backoff
      const delay = API_CONFIG.RETRY_DELAY_BASE * (retryCount + 1);
      logFn(`Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/${API_CONFIG.MAX_RETRIES})`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Recursive retry
      return editChunk(text, styleGuide, isFirst, logFn, retryCount + 1);
    }

    // All retries exhausted - rethrow
    throw err;
  }
}

/**
 * Generate a document-specific style guide from edited text.
 *
 * Called after the first chunk is edited. The resulting guide is included
 * in subsequent chunk requests to ensure consistency throughout the document.
 *
 * This function fails silently (returns default) because style guide
 * generation is not critical - editing can continue without it.
 *
 * @param {string} text - The first edited chunk
 * @param {function} logFn - Logging function: logFn(message, type='info')
 * @returns {Promise<string>} A brief style guide (3-4 sentences)
 */
export async function generateStyleGuide(text, logFn) {
  try {
    logFn('Generating style guide from first section...');

    const response = await fetch(`${API_BASE_URL}/api/generate-style-guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    // Return default on HTTP error (non-critical)
    if (!response.ok) {
      return 'Professional, clear, and engaging style following Reach Publishers standards.';
    }

    const data = await response.json();
    return data.styleGuide;

  } catch (err) {
    // Return default on any error (non-critical)
    return 'Professional, clear, and engaging style following Reach Publishers standards.';
  }
}

/**
 * Generate and trigger download of a Word document with Track Changes.
 *
 * Sends the original and edited text to the server, which:
 * 1. Computes the diff between original and edited
 * 2. Generates a .docx file with Track Changes markup
 * 3. Returns the binary file data
 *
 * The function then triggers a browser download of the file.
 *
 * @param {Object} content - Document content for generation
 * @param {string} content.original - Original manuscript text
 * @param {string} content.edited - AI-edited manuscript text
 * @param {string} content.fileName - Original file name (will add _EDITED suffix)
 * @returns {Promise<void>}
 * @throws {Error} If document generation fails
 */
export async function downloadDocument(content) {
  // Request the document from the server
  const response = await fetch(`${API_BASE_URL}/api/generate-docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalText: content.original,
      editedText: content.edited,
      fileName: formatFileName(content.fileName)
    })
  });

  // Handle errors
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Server failed to generate document');
  }

  // Get the binary data as a blob
  const blob = await response.blob();

  // Create a download link and trigger it
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = formatFileName(content.fileName);
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check the API configuration status.
 *
 * Used to verify the backend is running and properly configured
 * (e.g., API key is set).
 *
 * @returns {Promise<Object>} Status object with:
 *   - status: 'ready' | 'configuration_needed' | 'error'
 *   - apiKeyConfigured: boolean
 */
export async function checkApiStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    return await response.json();
  } catch (err) {
    // Return error status if request fails entirely
    return { status: 'error', apiKeyConfigured: false };
  }
}
