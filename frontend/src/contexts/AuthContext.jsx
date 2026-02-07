/** AuthContext -- Provides authentication state and actions (login, register, logout) to the React app. */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, AUTH_KEYS, TOKEN_REFRESH_BUFFER_MS, GUEST_USER } from '../constants';
import { decodeJwt, isTokenExpired } from '../utils/jwtUtils';
import { fetchWithTimeout } from '../utils/fetchUtils';

// --- Context ---

const AuthContext = createContext(null);

/** Default timeout for auth requests (15 seconds) */
const AUTH_TIMEOUT_MS = 15000;

// --- Provider Component ---

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Ref to prevent concurrent refresh calls
  const refreshingRef = useRef(null);

  // --- Token Management ---

  /**
   * Store tokens and user in localStorage.
   * Also clears any guest mode flag to prevent conflicts.
   */
  const storeAuth = useCallback((accessToken, refreshToken, userData) => {
    // Clear guest mode flag when storing real auth
    localStorage.removeItem(AUTH_KEYS.GUEST);
    localStorage.setItem(AUTH_KEYS.TOKEN, accessToken);
    localStorage.setItem(AUTH_KEYS.REFRESH, refreshToken);
    localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userData));
    setUser(userData);
  }, []);

  /**
   * Clear all stored auth data (including guest mode).
   */
  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.REFRESH);
    localStorage.removeItem(AUTH_KEYS.USER);
    localStorage.removeItem(AUTH_KEYS.GUEST);
    setUser(null);
  }, []);

  /**
   * Enter guest mode without authentication.
   * Sets up a guest user with restricted role that can preview the app.
   */
  const enterGuestMode = useCallback(() => {
    try {
      // Clear any existing auth data first
      localStorage.removeItem(AUTH_KEYS.TOKEN);
      localStorage.removeItem(AUTH_KEYS.REFRESH);
      localStorage.removeItem(AUTH_KEYS.USER);
      // Set guest mode flag
      localStorage.setItem(AUTH_KEYS.GUEST, 'true');
    } catch {
      // localStorage may be full, disabled, or blocked in private browsing
      // Continue anyway - guest mode will work for this session only
    }
    setUser(GUEST_USER);
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

    const refreshToken = localStorage.getItem(AUTH_KEYS.REFRESH);
    if (!refreshToken) {
      clearAuth();
      return null;
    }

    // Start the refresh and store the promise
    refreshingRef.current = (async () => {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        }, AUTH_TIMEOUT_MS);

        if (!response.ok) {
          // Check if another refresh (e.g., api.js) already succeeded
          // by comparing the current refresh token against what we sent.
          const currentRefresh = localStorage.getItem(AUTH_KEYS.REFRESH);
          if (currentRefresh && currentRefresh !== refreshToken) {
            const currentToken = localStorage.getItem(AUTH_KEYS.TOKEN);
            const storedUser = localStorage.getItem(AUTH_KEYS.USER);
            if (storedUser) setUser(JSON.parse(storedUser));
            return currentToken;
          }
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

  // --- Auth Actions ---

  /**
   * Login with email/username and password.
   *
   * @param {string} identifier - Email or username
   * @param {string} password - Password
   * @returns {Promise<Object>} User object
   * @throws {Error} If login fails
   */
  const login = useCallback(async (identifier, password) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    }, AUTH_TIMEOUT_MS);

    // Parse JSON safely — check response.ok first to handle non-JSON error pages
    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const data = await response.json();
        errorMessage = data.error || errorMessage;
      } catch {
        errorMessage = `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
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
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, inviteCode })
    }, AUTH_TIMEOUT_MS);

    // Parse JSON safely — check response.ok first to handle non-JSON error pages
    if (!response.ok) {
      let errorMessage = 'Registration failed';
      try {
        const data = await response.json();
        errorMessage = data.error || errorMessage;
      } catch {
        errorMessage = `Server error (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    storeAuth(data.accessToken, data.refreshToken, data.user);
    return data.user;
  }, [storeAuth]);

  /**
   * Logout: invalidate refresh token and clear local state.
   */
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(AUTH_KEYS.REFRESH);

    // Best-effort server-side logout (don't block on failure)
    try {
      await fetchWithTimeout(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      }, 5000); // Shorter timeout for logout
    } catch {
      // Server unreachable — clear locally anyway
    }

    clearAuth();
  }, [clearAuth]);

  // --- Initial Auth Check ---

  useEffect(() => {
    async function checkAuth() {
      // Check for guest mode first
      if (localStorage.getItem(AUTH_KEYS.GUEST) === 'true') {
        setUser(GUEST_USER);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem(AUTH_KEYS.TOKEN);
      const refreshToken = localStorage.getItem(AUTH_KEYS.REFRESH);

      if (!token && !refreshToken) {
        setLoading(false);
        return;
      }

      // If we have a token, try to validate it (or refresh if expired)
      try {
        let validToken = token;

        if (!token || isTokenExpired(token, TOKEN_REFRESH_BUFFER_MS)) {
          validToken = await refreshAccessToken();
        }

        if (validToken) {
          // Fetch fresh user profile
          const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${validToken}` }
          }, AUTH_TIMEOUT_MS);

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));
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

  // --- Context Value ---

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isGuest: user?.isGuest === true,
    login,
    register,
    logout,
    enterGuestMode
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
 * @returns {{ user, loading, isAuthenticated, isGuest, login, register, logout, enterGuestMode }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
