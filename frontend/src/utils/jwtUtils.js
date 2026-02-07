/** JWT Utilities -- Client-side JWT decoding and expiry checking (no signature verification). */

/**
 * Decode a JWT payload without verifying the signature.
 * Used to check expiry and extract claims on the client side.
 *
 * @param {string} token - JWT string
 * @returns {Object|null} Decoded payload or null if invalid
 */
export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    // Convert base64url to standard base64 before decoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired (or will expire within the buffer window).
 *
 * @param {string} token - JWT string
 * @param {number} bufferMs - Buffer time in milliseconds before actual expiry
 * @returns {boolean} True if token is expired or about to expire
 */
export function isTokenExpired(token, bufferMs = 0) {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return true;
  const expiresMs = decoded.exp * 1000;
  return Date.now() >= expiresMs - bufferMs;
}
