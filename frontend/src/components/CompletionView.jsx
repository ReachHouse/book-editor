/**
 * =============================================================================
 * COMPLETION VIEW COMPONENT
 * =============================================================================
 *
 * Displayed when document editing is complete. Shows a success message
 * and provides options to download the edited document or start a new edit.
 *
 * PROPS:
 * ------
 * @param {function} onDownload - Callback to download the edited document
 * @param {function} onEditAnother - Callback to reset and upload a new document
 * @param {boolean} isDownloading - True while document generation is in progress
 *
 * =============================================================================
 */

import React from 'react';
import { CheckCircle, Download, Loader } from 'lucide-react';

/**
 * Completion screen with download and reset options.
 */
function CompletionView({ onDownload, onEditAnother, isDownloading }) {
  return (
    <div className="glass-card p-6 sm:p-8 animate-scale-in">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-icon mb-5 animate-glow">
          <CheckCircle className="w-10 h-10 text-brand-400" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-white">
          Editing Complete
        </h2>
        <p className="text-surface-400 max-w-md mx-auto">
          Manuscript professionally edited following Reach Publishers House Style Guide.
        </p>
      </div>

      {/* Info boxes */}
      <div className="space-y-3 mb-8">
        <div className="info-box-green p-4">
          <p className="text-sm text-brand-300/90">
            <strong className="text-brand-300">Auto-Saved:</strong> Accessible anytime from &ldquo;Previously Edited Books&rdquo;
          </p>
        </div>

        <div className="info-box-blue p-4">
          <p className="text-sm text-blue-300/90 leading-relaxed">
            <strong className="text-blue-300">Track Changes:</strong> Downloads as Word (.docx) with full change tracking
            <br />
            <span className="text-red-400/90">Red strikethrough</span> for deletions
            <span className="mx-1.5 text-blue-500/50">&#183;</span>
            <span className="text-blue-300/90">Blue underline</span> for insertions
            <br />
            Open in Microsoft Word to review, accept, or reject changes.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="btn-primary flex-1 py-3.5 px-6 text-base flex items-center justify-center gap-2.5 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Generating Document...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download Word Document
            </>
          )}
        </button>
        <button
          onClick={onEditAnother}
          className="btn-secondary py-3.5 px-6 text-base focus-ring"
        >
          Edit Another
        </button>
      </div>
    </div>
  );
}

export default CompletionView;
