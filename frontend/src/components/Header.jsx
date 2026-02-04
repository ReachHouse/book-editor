/**
 * =============================================================================
 * HEADER COMPONENT
 * =============================================================================
 *
 * The main header displayed at the top of the application.
 * Contains the application logo, title, and a button to view the style guide.
 *
 * PROPS:
 * ------
 * @param {function} onShowStyleGuide - Callback to show the StyleGuideModal
 *
 * =============================================================================
 */

import React from 'react';
import { FileText, BookOpen } from 'lucide-react';

/**
 * Header component displaying app title and style guide access.
 *
 * @param {Object} props - Component props
 * @param {function} props.onShowStyleGuide - Called when user clicks style guide button
 */
function Header({ onShowStyleGuide }) {
  return (
    <div className="text-center mb-10 animate-fade-in">
      {/* Logo mark */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-icon mb-5">
        <FileText className="w-7 h-7 text-brand-400" />
      </div>

      {/* Title - serif font for editorial identity */}
      <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2 text-white tracking-tight">
        Professional Book Editor
      </h1>

      {/* Subtle decorative line */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-surface-700/40" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-500/40" />
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-surface-700/40" />
      </div>

      {/* Subtitle */}
      <p className="text-surface-400 text-sm mb-6 font-light tracking-wide">
        AI-powered manuscript editing with tracked changes
      </p>

      {/* Style Guide Button */}
      <button
        onClick={onShowStyleGuide}
        className="btn-secondary inline-flex items-center gap-2.5 py-2.5 px-5 text-sm focus-ring"
      >
        <BookOpen className="w-4 h-4 text-brand-400" />
        View Reach Publishers Style Guide
      </button>
    </div>
  );
}

export default Header;
