/**
 * =============================================================================
 * STYLE GUIDE MODAL COMPONENT
 * =============================================================================
 *
 * Full-screen modal displaying/editing the Reach House Style Guide.
 *
 * Supports two modes:
 * - 'view': Read-only display of the style guide (default)
 * - 'edit': Editable textarea with Save/Reset buttons
 *
 * PROPS:
 * ------
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 * @param {'edit'|'view'} mode - Edit mode or view-only mode (default: 'view')
 * @param {string} value - Current style guide text (used in edit mode)
 * @param {function} onChange - Callback when text changes (edit mode only)
 * @param {function} onSave - Callback when Save is clicked (edit mode only)
 * @param {function} onReset - Callback when Reset to Default is clicked (edit mode only)
 *
 * =============================================================================
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BookOpen, X, RotateCcw } from 'lucide-react';
import { FULL_STYLE_GUIDE_DOCUMENT, MAX_CUSTOM_STYLE_GUIDE_LENGTH } from '../constants';

/**
 * Modal displaying/editing the Reach House style guide.
 * Supports entry and exit animations via isClosing state.
 */
function StyleGuideModal({
  isOpen,
  onClose,
  mode = 'view',
  value,
  onChange,
  onSave,
  onReset
}) {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const isEditMode = mode === 'edit';
  const displayValue = value ?? FULL_STYLE_GUIDE_DOCUMENT;
  const charCount = displayValue?.length || 0;
  const isOverLimit = charCount > MAX_CUSTOM_STYLE_GUIDE_LENGTH;

  // Clean up close timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      // Restore focus to previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      onClose();
    }, 200);
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (onSave && !isOverLimit) {
      onSave();
      handleClose();
    }
  }, [onSave, isOverLimit, handleClose]);

  // Lock body scroll and manage focus when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element for restoration
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      // Focus the modal for screen readers
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key and trap focus within modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      // Focus trap: Tab cycles within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        // Guard against empty focusable elements list
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      {/* Backdrop - hidden from screen readers */}
      <div
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-md"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal with proper dialog semantics */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-guide-title"
        tabIndex={-1}
        className={`relative glass-card w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-700/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg glass-icon flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-brand-400" aria-hidden="true" />
              </div>
              <h2 id="style-guide-title" className="text-lg font-semibold text-white">
                {isEditMode ? 'Edit Style Guide' : 'Reach House Style Guide'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-surface-700/80 transition-all duration-200 focus-ring"
              aria-label="Close style guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isEditMode ? (
            <>
              <div className="info-box-green p-3 mb-4">
                <p className="text-xs text-brand-300/90">
                  <strong className="text-brand-300">Note:</strong> Changes to this guide will affect how the AI edits your document. The guide is saved with your project.
                </p>
              </div>

              <textarea
                value={displayValue}
                onChange={(e) => onChange?.(e.target.value)}
                className="w-full h-96 glass-inner p-4 text-xs text-surface-300 leading-relaxed font-sans resize-none focus-ring rounded-lg"
                placeholder="Enter your style guide..."
                aria-label="Style guide content"
              />

              <div className={`text-xs mt-2 ${isOverLimit ? 'text-red-400' : 'text-surface-500'}`}>
                {charCount.toLocaleString()} / {MAX_CUSTOM_STYLE_GUIDE_LENGTH.toLocaleString()} characters
                {isOverLimit && ' (exceeds limit)'}
              </div>
            </>
          ) : (
            <>
              <div className="info-box-green p-3 mb-4">
                <p className="text-xs text-brand-300/90">
                  <strong className="text-brand-300">Note:</strong> All edits follow the Reach House Style Guide.
                </p>
              </div>

              <div className="glass-inner p-4">
                <pre
                  className="whitespace-pre-wrap text-xs text-surface-300 leading-relaxed font-sans m-0"
                >
                  {displayValue}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-700/20 flex-shrink-0">
          {isEditMode ? (
            <div className="flex gap-3">
              <button
                onClick={onReset}
                className="btn-secondary flex-1 py-2.5 text-sm focus-ring inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Default
              </button>
              <button
                onClick={handleSave}
                disabled={isOverLimit}
                className="btn-primary flex-1 py-2.5 text-sm focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={handleClose}
              className="btn-primary w-full py-2.5 text-sm focus-ring"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StyleGuideModal;
