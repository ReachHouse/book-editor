/**
 * =============================================================================
 * HEADER COMPONENT
 * =============================================================================
 *
 * The main header displayed at the top of the application.
 * Contains the application logo, title, style guide button, and user info.
 *
 * PROPS:
 * ------
 * @param {function} onShowStyleGuide - Callback to show the StyleGuideModal
 * @param {function} [onShowAdmin]    - Callback to show the AdminDashboard (admin only)
 * @param {Object} [user]             - Current authenticated user object
 *
 * =============================================================================
 */

import React, { useState } from 'react';
import { FileText, BookOpen, LogOut, Loader, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Header component displaying app title, style guide access, and user controls.
 *
 * @param {Object} props - Component props
 * @param {function} props.onShowStyleGuide - Called when user clicks style guide button
 * @param {function} [props.onShowAdmin] - Called when admin clicks admin dashboard button
 * @param {Object} [props.user] - Current authenticated user
 */
function Header({ onShowStyleGuide, onShowAdmin, user }) {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="text-center mb-10 animate-fade-in">
      {/* User bar - positioned at top right */}
      {user && (
        <div className="flex items-center justify-end gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <User className="w-3.5 h-3.5" />
            <span>{user.username}</span>
            {user.role === 'admin' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-medium">
                Admin
              </span>
            )}
          </div>
          {user.role === 'admin' && onShowAdmin && (
            <button
              onClick={onShowAdmin}
              className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors py-1 px-2 rounded hover:bg-surface-800/50"
              aria-label="Admin dashboard"
            >
              <Settings className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors py-1 px-2 rounded hover:bg-surface-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign out"
          >
            {loggingOut ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            Sign out
          </button>
        </div>
      )}

      {/* Logo mark */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-icon mb-6">
        <FileText className="w-7 h-7 text-brand-400" />
      </div>

      {/* Title - serif font for editorial identity */}
      <h1 className="font-display text-3xl font-bold mb-2 text-white tracking-tight">
        Reach House Book Editor
      </h1>

      {/* Subtle decorative line */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-surface-700/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-500/40" />
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-surface-700/40" />
      </div>

      {/* Subtitle */}
      <p className="text-sm text-surface-400 tracking-wide">
        AI-powered manuscript editing with tracked changes
      </p>

      {/* Style Guide Button */}
      <button
        onClick={onShowStyleGuide}
        className="btn-secondary inline-flex items-center gap-2 mt-6 py-2.5 px-5 text-sm focus-ring"
      >
        <BookOpen className="w-4 h-4 text-brand-400" />
        View Style Guide
      </button>
    </div>
  );
}

export default Header;
