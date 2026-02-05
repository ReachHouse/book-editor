/**
 * =============================================================================
 * AUTH CONTEXT
 * =============================================================================
 *
 * Provides authentication state and actions to the entire React app.
 *
 * STATE:
 * ------
 * - user:          Current user object (null if not logged in)
 * - loading:       True during initial auth check on mount
 * - isAuthenticated: Convenience boolean
 *
 * ACTIONS:
 * --------
 * - login(identifier, password)  - Authenticate and store tokens
 * - register(username, email, password, inviteCode) - Create account
 * - logout()                      - Clear tokens and redirect to login
 * - getAccessToken()              - Get current access token (auto-refreshes if expired)
 *
 * TOKEN STORAGE:
 * --------------
 * Access and refresh tokens are stored in localStorage.
 * The access token is checked for expiry before each API call.
 * If expired, the refresh token is used to obtain a new pair.
 *
 * USAGE:
 * ------
 * // In App.jsx
 * import { AuthProvider } from './contexts/AuthContext';
 * <AuthProvider><App /></AuthProvider>
 *
 * // In any component
 * import { useAuth } from './contexts/AuthContext';
 * const { user, login, logout } = useAuth();
 *
 * =============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../constants';

// =============================================================================
// CONSTANTS
// =============================================================================

const TOKEN_KEY = 'book_editor_access_token';
const REFRESH_KEY = 'book_editor_refresh_token';
const USER_KEY = 'book_editor_user';

// Refresh the access token 60 seconds before it expires
const REFRESH_BUFFER_MS = 60 * 1000;

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext(null);

/**
 * Decode a JWT payload without verifying the signature.
 * Used to check expiry on the client side.
 *
 * @param {string} token - JWT string
 * @returns {Object|null} Decoded payload or null if invalid
 */
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired (or will expire within the buffer window).
 *
 * @param {string} token - JWT string
 * @returns {boolean} True if token is expired or about to expire
 */
function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  const expiresMs = decoded.exp * 1000;
  return Date.now() >= expiresMs - REFRESH_BUFFER_MS;
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Ref to prevent concurrent refresh calls
  const refreshingRef = useRef(null);

  // =========================================================================
  // TOKEN MANAGEMENT
  // =========================================================================

  /**
   * Store tokens and user in localStorage.
   */
  const storeAuth = useCallback((accessToken, refreshToken, userData) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  /**
   * Clear all stored auth data.
   */
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  /**
   * Refresh the access token using the stored refresh token.
   * Uses a shared promise to prevent concurrent refresh attempts.
   *
   * @returns {Promise<string|null>} New access token or null on failure
   */
  const refreshAccessToken = useCallback(async () => {
    // If a refresh is already in progress, wait for it
    if (refreshingRef.current) {
      return refreshingRef.current;
    }

    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      clearAuth();
      return null;
    }

    // Start the refresh and store the promise
    refreshingRef.current = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          clearAuth();
          return null;
        }

        const data = await response.json();
        storeAuth(data.accessToken, data.refreshToken, data.user);
        return data.accessToken;
      } catch {
        clearAuth();
        return null;
      } finally {
        refreshingRef.current = null;
      }
    })();

    return refreshingRef.current;
  }, [clearAuth, storeAuth]);

  /**
   * Get a valid access token, refreshing if necessary.
   * This is the main method API calls should use.
   *
   * @returns {Promise<string|null>} Valid access token or null
   */
  const getAccessToken = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) return null;

    if (isTokenExpired(token)) {
      return refreshAccessToken();
    }

    return token;
  }, [refreshAccessToken]);

  // =========================================================================
  // AUTH ACTIONS
  // =========================================================================

  /**
   * Login with email/username and password.
   *
   * @param {string} identifier - Email or username
   * @param {string} password - Password
   * @returns {Promise<Object>} User object
   * @throws {Error} If login fails
   */
  const login = useCallback(async (identifier, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    storeAuth(data.accessToken, data.refreshToken, data.user);
    return data.user;
  }, [storeAuth]);

  /**
   * Register a new account.
   *
   * @param {string} username
   * @param {string} email
   * @param {string} password
   * @param {string} inviteCode
   * @returns {Promise<Object>} User object
   * @throws {Error} If registration fails
   */
  const register = useCallback(async (username, email, password, inviteCode) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, inviteCode })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    storeAuth(data.accessToken, data.refreshToken, data.user);
    return data.user;
  }, [storeAuth]);

  /**
   * Logout: invalidate refresh token and clear local state.
   */
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);

    // Best-effort server-side logout (don't block on failure)
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      // Server unreachable — clear locally anyway
    }

    clearAuth();
  }, [clearAuth]);

  // =========================================================================
  // INITIAL AUTH CHECK
  // =========================================================================

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem(TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_KEY);

      if (!token && !refreshToken) {
        setLoading(false);
        return;
      }

      // If we have a token, try to validate it (or refresh if expired)
      try {
        let validToken = token;

        if (!token || isTokenExpired(token)) {
          validToken = await refreshAccessToken();
        }

        if (validToken) {
          // Fetch fresh user profile
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${validToken}` }
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setUser(data.user);
          } else {
            clearAuth();
          }
        }
      } catch {
        // Network error during initial check — keep stored user for offline display
      }

      setLoading(false);
    }

    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // CONTEXT VALUE
  // =========================================================================

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    getAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 *
 * @returns {{ user, loading, isAuthenticated, login, register, logout, getAccessToken }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
