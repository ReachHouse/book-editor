/** CompletionView — Success screen with download and reset options. */

import React from 'react';
import { CheckCircle, Download, Loader } from 'lucide-react';

function CompletionView({ onDownload, onEditAnother, isDownloading }) {
  return (
    <div className="glass-card p-6 sm:p-8 animate-scale-in">
      {/* Success header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-icon mb-4 animate-glow">
          <CheckCircle className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="text-lg font-semibold mb-2 text-white">
          Editing Complete
        </h2>
        <p className="text-sm text-surface-400 max-w-md mx-auto">
          Manuscript edited following the Reach House Style Guide.
        </p>
      </div>

      {/* Info boxes */}
      <div className="space-y-3 mb-6">
        <div className="info-box-green p-4">
          <p className="text-sm text-brand-300/90">
            <strong className="text-brand-300">Auto-Saved:</strong> Accessible anytime from &ldquo;Previously Edited Books&rdquo;
          </p>
        </div>

        <div className="info-box-blue p-4">
          <p className="text-sm text-blue-300/90">
            <strong className="text-blue-300">Word Document:</strong> Open in Word to review and accept or reject edits.
            <br />
            <span className="text-surface-400 text-xs">
              <span className="text-red-400/80">Red strikethrough</span> = deletions
              <span className="mx-1.5 text-surface-600">·</span>
              <span className="text-blue-300/80">Blue underline</span> = insertions
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="btn-primary flex-1 py-3 px-5 text-sm flex items-center justify-center gap-2 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="btn-secondary py-3 px-5 text-sm focus-ring"
        >
          Edit Another
        </button>
      </div>
    </div>
  );
}

export default CompletionView;
