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
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                          [FileText Icon]                            │
 * │                    Professional Book Editor                         │
 * │           AI-powered manuscript editing with tracked changes        │
 * │                                                                     │
 * │              [View Reach Publishers Style Guide]                    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * STYLING:
 * --------
 * - Uses Tailwind CSS for all styling
 * - Green accent color (#22c55e) for icon and highlights
 * - Responsive design centered on all screen sizes
 * - Button has hover effects (scale and color change)
 *
 * ICONS:
 * ------
 * - FileText (lucide-react): Main application logo
 * - BookOpen (lucide-react): Icon on the style guide button
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
    <div className="text-center mb-16">
      {/* Application Logo */}
      <div className="flex items-center justify-center mb-6">
        <FileText className="w-16 h-16 text-green-500" />
      </div>

      {/* Application Title */}
      <h1 className="text-5xl font-bold mb-3">Professional Book Editor</h1>

      {/* Subtitle */}
      <p className="text-gray-400 text-lg mb-6">
        AI-powered manuscript editing with tracked changes
      </p>

      {/* Style Guide Button */}
      <button
        onClick={onShowStyleGuide}
        className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all hover:scale-105"
      >
        <BookOpen className="w-5 h-5" />
        View Reach Publishers Style Guide
      </button>
    </div>
  );
}

export default Header;
