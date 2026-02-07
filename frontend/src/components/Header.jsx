/** Header — App title, style guide access, and user controls. */

import React, { useState } from 'react';
import { FileText, BookOpen, LogOut, Loader, User, Settings, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES } from '../constants';
function Header({ onShowStyleGuide, onShowAdmin, user, styleGuideMode = 'view' }) {
  const { logout, isGuest } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSignIn = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="text-center mb-10 animate-fade-in">
      {user && (
        <div className="flex items-center justify-end gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <User className="w-3.5 h-3.5" />
            <span>{user.username}</span>
            {user.role && USER_ROLES[user.role] && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${USER_ROLES[user.role].badgeClass}`}>
                {USER_ROLES[user.role].label}
              </span>
            )}
          </div>
          {!isGuest && user.role === 'admin' && onShowAdmin && (
            <button
              onClick={onShowAdmin}
              className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors py-1 px-2 rounded hover:bg-surface-800/50"
              aria-label="Admin dashboard"
            >
              <Settings className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
          {isGuest ? (
            <button
              onClick={handleSignIn}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors py-1 px-2 rounded hover:bg-surface-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sign in"
            >
              {loggingOut ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              Sign in
            </button>
          ) : (
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
          )}
        </div>
      )}

      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-icon mb-6">
        <FileText className="w-7 h-7 text-brand-400" />
      </div>

      <h1 className="font-display text-3xl font-bold mb-2 text-white tracking-tight">
        Reach House Book Editor
      </h1>

      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-surface-700/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-500/40" />
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-surface-700/40" />
      </div>

      <p className="text-sm text-surface-400 tracking-wide">
        AI-powered manuscript editing with tracked changes
      </p>

      <button
        onClick={onShowStyleGuide}
        className="btn-secondary inline-flex items-center gap-2 mt-6 py-2.5 px-5 text-sm focus-ring"
      >
        <BookOpen className="w-4 h-4 text-brand-400" />
        {styleGuideMode === 'edit' ? 'Edit Style Guide' : 'View Style Guide'}
      </button>
    </div>
  );
}

export default Header;
