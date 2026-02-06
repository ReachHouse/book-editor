/**
 * =============================================================================
 * FETCH UTILITIES
 * =============================================================================
 *
 * Shared fetch utilities used throughout the frontend.
 *
 * =============================================================================
 */

/**
 * Default timeout for fetch requests (30 seconds).
 */
export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Fetch wrapper with timeout support using AbortController.
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30 seconds)
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} If request times out or fails
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
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
