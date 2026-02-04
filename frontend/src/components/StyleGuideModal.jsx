/**
 * =============================================================================
 * STYLE GUIDE MODAL COMPONENT
 * =============================================================================
 *
 * Full-screen modal displaying the complete Reach Publishers House Style Guide.
 *
 * PROPS:
 * ------
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 *
 * =============================================================================
 */

import React, { useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';
import { FULL_STYLE_GUIDE_DOCUMENT } from '../constants';

/**
 * Modal displaying the complete Reach Publishers style guide.
 */
function StyleGuideModal({ isOpen, onClose }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative glass-card w-full max-w-2xl animate-scale-in overflow-hidden"
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-700/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg glass-icon flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-brand-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Reach Publishers Style Guide</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-surface-700/80 transition-all duration-200 focus-ring"
              aria-label="Close style guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="info-box-green p-3 mb-4">
            <p className="text-xs text-brand-300/80">
              <strong className="text-brand-300">Important:</strong> All edits strictly follow the Reach Publishers House Style Guide.
            </p>
          </div>

          <div className="glass-inner p-4">
            <pre
              className="whitespace-pre-wrap text-xs text-surface-300 leading-relaxed font-sans"
              style={{ margin: 0 }}
            >
              {FULL_STYLE_GUIDE_DOCUMENT}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-700/20 flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-primary w-full py-2.5 text-sm focus-ring"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StyleGuideModal;
