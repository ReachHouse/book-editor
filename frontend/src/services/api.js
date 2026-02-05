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
 * AUTHENTICATION:
 * ---------------
 * All API requests include a JWT access token in the Authorization header.
 * The getAuthHeaders() helper reads the token from localStorage and
 * auto-refreshes it when expired.
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

/**
 * Default timeout for API requests (5 minutes)
 * Editing large chunks can take time; this prevents indefinite hangs
 */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

/** localStorage keys (must match AuthContext) */
const TOKEN_KEY = 'book_editor_access_token';
const REFRESH_KEY = 'book_editor_refresh_token';
const USER_KEY = 'book_editor_user';

/** Buffer before expiry to trigger refresh (60 seconds) */
const REFRESH_BUFFER_MS = 60 * 1000;

/** Shared refresh promise to prevent concurrent refresh requests */
let refreshPromise = null;

/**
 * Decode a JWT payload to check expiry (no signature verification).
 * @param {string} token
 * @returns {Object|null}
 */
function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

/**
 * Refresh the access token using the stored refresh token.
 * Returns the new access token, or null on failure.
 *
 * @returns {Promise<string|null>}
 */
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) {
        // Refresh failed — clear auth (will cause redirect to login)
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Get headers including a valid Authorization token.
 * Auto-refreshes the token if it's about to expire.
 *
 * @returns {Promise<Object>} Headers object with Content-Type and Authorization
 */
async function getAuthHeaders() {
  let token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    const decoded = decodeJwt(token);
    if (decoded && decoded.exp && Date.now() >= decoded.exp * 1000 - REFRESH_BUFFER_MS) {
      token = await refreshAccessToken();
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch wrapper with timeout support using AbortController.
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} If request times out or fails
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  logFn('Sending section to editor...');

  try {
    // Get auth headers (auto-refreshes token if needed)
    const headers = await getAuthHeaders();

    // Make the API request with timeout
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/edit-chunk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, styleGuide, isFirst })
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Response wasn't JSON, use default message
      }
      throw new Error(errorMessage);
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
      logFn(`Connection issue — retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${API_CONFIG.MAX_RETRIES})`);

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
    logFn('Building consistency guide from first section...');

    const headers = await getAuthHeaders();

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/generate-style-guide`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    }, 2 * 60 * 1000); // 2 minute timeout for style guide (shorter task)

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
 * @param {string} content.fileName - Formatted file name (already includes _EDITED suffix)
 * @returns {Promise<void>}
 * @throws {Error} If document generation fails
 */
export async function downloadDocument(content) {
  // Get auth headers (auto-refreshes token if needed)
  const headers = await getAuthHeaders();

  // Request the document from the server with timeout
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/generate-docx`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      originalText: content.original,
      editedText: content.edited,
      fileName: content.fileName
    })
  }, 3 * 60 * 1000); // 3 minute timeout for document generation

  // Handle errors
  if (!response.ok) {
    let errorMessage = `Server failed to generate document (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Response wasn't JSON, use default message
    }
    throw new Error(errorMessage);
  }

  // Get the binary data as a blob
  const blob = await response.blob();

  // Create a download link and trigger it
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = content.fileName;
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
