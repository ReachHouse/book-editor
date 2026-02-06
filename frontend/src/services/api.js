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
 * POST   /api/edit-chunk          - Send text to Claude for editing
 * POST   /api/generate-style-guide - Generate consistency guide from first chunk
 * POST   /api/generate-docx       - Create Word document with Track Changes
 * GET    /api/projects            - List user's projects (metadata)
 * GET    /api/projects/:id        - Get full project data
 * PUT    /api/projects/:id        - Save/update a project
 * DELETE /api/projects/:id        - Delete a project
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

import { API_BASE_URL, API_CONFIG, API_TIMEOUTS, AUTH_KEYS, TOKEN_REFRESH_BUFFER_MS } from '../constants';
import { decodeJwt } from '../utils/jwtUtils';
import { fetchWithTimeout } from '../utils/fetchUtils';

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

/**
 * Shared refresh promise to prevent concurrent refresh requests.
 * All concurrent API calls share this single promise so only one
 * refresh request is sent to the server at a time.
 */
let refreshPromise = null;

/**
 * Refresh the access token using the stored refresh token.
 * Returns the new access token, or null on failure.
 *
 * @returns {Promise<string|null>}
 */
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem(AUTH_KEYS.REFRESH);
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
        localStorage.removeItem(AUTH_KEYS.TOKEN);
        localStorage.removeItem(AUTH_KEYS.REFRESH);
        localStorage.removeItem(AUTH_KEYS.USER);
        return null;
      }
      const data = await res.json();
      localStorage.setItem(AUTH_KEYS.TOKEN, data.accessToken);
      localStorage.setItem(AUTH_KEYS.REFRESH, data.refreshToken);
      localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));
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
  let token = localStorage.getItem(AUTH_KEYS.TOKEN);

  if (token) {
    const decoded = decodeJwt(token);
    if (decoded && decoded.exp && Date.now() >= decoded.exp * 1000 - TOKEN_REFRESH_BUFFER_MS) {
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
 * Edit a chunk of text via the Claude AI backend.
 *
 * Sends the text to the server, which forwards it to Claude for editing
 * according to the Reach House House Style Guide.
 *
 * Includes automatic retry logic for transient failures.
 *
 * @param {string} text - The text chunk to edit (~2000 words)
 * @param {string} styleGuide - Document-specific style guide for consistency
 * @param {boolean} isFirst - True if this is the first chunk (no prior context)
 * @param {function} logFn - Logging function: logFn(message, type='info')
 * @param {number} retryCount - Internal: current retry attempt number
 * @param {string|null} customStyleGuide - User-customized style guide (optional)
 * @returns {Promise<string>} The edited text
 * @throws {Error} If all retry attempts fail
 */
export async function editChunk(text, styleGuide, isFirst, logFn, retryCount = 0, customStyleGuide = null) {
  logFn('Sending section to editor...');

  try {
    // Get auth headers (auto-refreshes token if needed)
    const headers = await getAuthHeaders();

    // Make the API request with timeout
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/edit-chunk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, styleGuide, isFirst, customStyleGuide })
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
      return editChunk(text, styleGuide, isFirst, logFn, retryCount + 1, customStyleGuide);
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
    }, API_TIMEOUTS.STYLE_GUIDE);

    // Return default on HTTP error (non-critical)
    if (!response.ok) {
      return 'Professional, clear, and engaging style following Reach House standards.';
    }

    const data = await response.json();
    return data.styleGuide;

  } catch (err) {
    // Return default on any error (non-critical)
    return 'Professional, clear, and engaging style following Reach House standards.';
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
  }, API_TIMEOUTS.DOCX);

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

  try {
    document.body.appendChild(a);
    a.click();
  } finally {
    // Always clean up to prevent memory leaks
    if (a.parentNode) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }
}

// =============================================================================
// USAGE API
// =============================================================================

/**
 * Get the current user's usage summary (daily + monthly).
 *
 * @returns {Promise<Object>} Usage data with daily/monthly totals, limits, percentages
 */
export async function getUsage() {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/usage`, {
    method: 'GET',
    headers
  }, API_TIMEOUTS.SHORT);

  if (!response.ok) {
    throw new Error(`Failed to load usage data (${response.status})`);
  }

  return await response.json();
}

// =============================================================================
// PROJECT API
// =============================================================================

/**
 * List all projects for the current user (metadata only).
 *
 * @returns {Promise<Array>} Array of project metadata objects
 */
export async function listProjects() {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/projects`, {
    method: 'GET',
    headers
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    throw new Error(`Failed to load projects (${response.status})`);
  }

  const data = await response.json();
  return data.projects;
}

/**
 * Get a single project with full data (text content included).
 *
 * @param {string} projectId - The project ID
 * @returns {Promise<Object>} Full project data
 */
export async function getProject(projectId) {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: 'GET',
    headers
  }, API_TIMEOUTS.PROJECT);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to load project (${response.status})`);
  }

  return await response.json();
}

/**
 * Save or update a project on the server.
 *
 * @param {Object} projectData - Project data to save
 * @returns {Promise<Object>} Saved project metadata
 */
export async function saveProject(projectData) {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/projects/${projectData.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(projectData)
  }, API_TIMEOUTS.PROJECT);

  if (!response.ok) {
    let errorMessage = `Failed to save project (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Response wasn't JSON
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.project;
}

/**
 * Delete a project from the server.
 *
 * @param {string} projectId - The project ID to delete
 * @returns {Promise<void>}
 */
export async function deleteProjectApi(projectId) {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: 'DELETE',
    headers
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    throw new Error(`Failed to delete project (${response.status})`);
  }
}

// =============================================================================
// ADMIN API
// =============================================================================

/**
 * List all users with usage data (admin only).
 *
 * @returns {Promise<Array>} Array of user objects
 */
export async function adminListUsers() {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/admin/users`, {
    method: 'GET',
    headers
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(data.error || `Failed to load users (${response.status})`);
  }

  const data = await response.json();
  return data.users;
}

/**
 * Update a user's role, limits, or active status (admin only).
 *
 * @param {number} userId - User ID to update
 * @param {Object} fields - Fields to update
 * @returns {Promise<Object>} Updated user object
 */
export async function adminUpdateUser(userId, fields) {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(fields)
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(data.error || `Failed to update user (${response.status})`);
  }

  const data = await response.json();
  return data.user;
}

/**
 * Delete a user (admin only).
 *
 * @param {number} userId - User ID to delete
 * @returns {Promise<void>}
 */
export async function adminDeleteUser(userId) {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(data.error || `Failed to delete user (${response.status})`);
  }
}

/**
 * List all invite codes (admin only).
 *
 * @returns {Promise<Array>} Array of invite code objects
 */
export async function adminListInviteCodes() {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/admin/invite-codes`, {
    method: 'GET',
    headers
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(data.error || `Failed to load invite codes (${response.status})`);
  }

  const data = await response.json();
  return data.codes;
}

/**
 * Generate a new invite code (admin only).
 *
 * @returns {Promise<Object>} The generated invite code object
 */
export async function adminCreateInviteCode() {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/admin/invite-codes`, {
    method: 'POST',
    headers
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(data.error || `Failed to generate invite code (${response.status})`);
  }

  const data = await response.json();
  return data.code;
}

/**
 * Delete an unused invite code (admin only).
 *
 * @param {number} codeId - The ID of the invite code to delete
 * @returns {Promise<void>}
 */
export async function adminDeleteInviteCode(codeId) {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/admin/invite-codes/${codeId}`, {
    method: 'DELETE',
    headers
  }, API_TIMEOUTS.DEFAULT);

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(data.error || `Failed to delete invite code (${response.status})`);
  }
}

// =============================================================================
// FIRST-TIME SETUP (No auth required - only works when no users exist)
// =============================================================================

/**
 * Check if first-time setup is required.
 * Returns setup status including whether setup is needed and if it's enabled.
 *
 * @returns {Promise<{ needsSetup: boolean, setupEnabled: boolean }>} Setup status
 */
export async function checkSetupRequired() {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/setup/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }, API_TIMEOUTS.SHORT);

  if (!response.ok) {
    // On error, assume setup not required (show login instead)
    console.error('Failed to check setup status');
    return { needsSetup: false, setupEnabled: false };
  }

  const data = await response.json();
  return {
    needsSetup: data.needsSetup === true,
    setupEnabled: data.setupEnabled === true
  };
}

/**
 * Complete first-time setup by creating the initial admin account.
 * Only works when no users exist in the database.
 *
 * @param {Object} params - Setup parameters
 * @param {string} params.setup_secret - Setup secret from deployment environment
 * @param {string} params.username - Admin username (3-30 chars, alphanumeric/-/_)
 * @param {string} params.email - Admin email
 * @param {string} params.password - Admin password (8+ chars, upper/lower/number)
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function completeSetup({ setup_secret, username, email, password }) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/setup/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setup_secret, username, email, password })
  }, API_TIMEOUTS.DEFAULT);

  const data = await response.json().catch(() => ({ error: 'Server error' }));

  if (!response.ok) {
    throw new Error(data.error || `Setup failed (${response.status})`);
  }

  return data;
}
