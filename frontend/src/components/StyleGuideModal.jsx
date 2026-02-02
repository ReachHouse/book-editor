/**
 * =============================================================================
 * STYLE GUIDE MODAL COMPONENT
 * =============================================================================
 *
 * Full-screen modal displaying the complete Reach Publishers House Style Guide.
 * Triggered by clicking "View Reach Publishers Style Guide" button in Header.
 *
 * PROPS:
 * ------
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ┌─────────────────────────────────────────────────────────────┐     │
 * │ │ [BookOpen] Reach Publishers Style Guide              [X]   │     │
 * │ ├─────────────────────────────────────────────────────────────┤     │
 * │ │ ┌─────────────────────────────────────────────────────────┐ │     │
 * │ │ │ Important: All edits strictly follow the Reach         │ │     │
 * │ │ │ Publishers House Style Guide.                          │ │     │
 * │ │ └─────────────────────────────────────────────────────────┘ │     │
 * │ │                                                             │     │
 * │ │ ┌─────────────────────────────────────────────────────────┐ │     │
 * │ │ │ REACH PUBLISHERS NEW EDITORS' GUIDELINES...            │ │     │
 * │ │ │ [Full style guide text - scrollable]                   │ │     │
 * │ │ └─────────────────────────────────────────────────────────┘ │     │
 * │ ├─────────────────────────────────────────────────────────────┤     │
 * │ │                      [ Close ]                              │     │
 * │ └─────────────────────────────────────────────────────────────┘     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * LAYOUT STRUCTURE:
 * -----------------
 * - Fixed overlay (bg-black 80% opacity) covering entire viewport
 * - Centered modal card with max-width: 2xl (672px)
 * - Three sections: Header (fixed), Content (scrollable), Footer (fixed)
 * - Maximum height: 80vh to ensure it fits on screen
 *
 * CONTENT SOURCE:
 * ---------------
 * The style guide text comes from FULL_STYLE_GUIDE_DOCUMENT constant
 * defined in constants/index.js. This is the complete editing brief
 * from Sally Veenman, Head of Editing Department.
 *
 * ACCESSIBILITY:
 * --------------
 * - Close button (X) in header
 * - Close button in footer
 * - High z-index (50) to appear above other content
 * - Semi-transparent backdrop allows context awareness
 *
 * NOTE:
 * -----
 * Returns null when isOpen is false, so it can be safely included
 * in the render without conditional checks.
 *
 * =============================================================================
 */

import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { FULL_STYLE_GUIDE_DOCUMENT } from '../constants';

/**
 * Modal displaying the complete Reach Publishers style guide.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether to show the modal
 * @param {function} props.onClose - Close button handler
 */
function StyleGuideModal({ isOpen, onClose }) {
  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    // Backdrop overlay - covers entire screen
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-6 overflow-auto">
      {/* Modal Container */}
      <div
        className="bg-gray-800 rounded-xl w-full max-w-2xl my-auto shadow-2xl"
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header - Fixed at top */}
        <div className="p-4 border-b border-gray-700" style={{ flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            {/* Title with icon */}
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-500" />
              Reach Publishers Style Guide
            </h2>

            {/* Close button (X) */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable middle section */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {/* Important Notice */}
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 mb-4">
            <p className="text-xs text-green-400">
              <strong>Important:</strong> All edits strictly follow the Reach Publishers House Style Guide.
            </p>
          </div>

          {/* Style Guide Content */}
          <div className="bg-gray-900 rounded-lg p-3">
            <pre
              className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed"
              style={{ margin: 0 }}
            >
              {FULL_STYLE_GUIDE_DOCUMENT}
            </pre>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-4 border-t border-gray-700" style={{ flexShrink: 0 }}>
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StyleGuideModal;
