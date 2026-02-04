/**
 * =============================================================================
 * PROCESSING VIEW COMPONENT
 * =============================================================================
 *
 * Displays the editing progress while the document is being processed.
 * Shows a progress bar, status messages, and a debug log of operations.
 *
 * PROPS:
 * ------
 * @param {Object} progress - Progress state object (current, total, stage)
 * @param {Array} debugLog - Array of log entries
 *
 * =============================================================================
 */

import React from 'react';
import { Loader } from 'lucide-react';
import DebugLog from './DebugLog';

/**
 * Processing progress display with debug log.
 */
function ProcessingView({ progress, debugLog }) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="glass-card p-6 sm:p-8 mb-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Processing Manuscript</h2>
          <p className="text-sm text-surface-400">{progress.stage}</p>
        </div>
        <div className="w-10 h-10 rounded-xl glass-icon flex items-center justify-center">
          <Loader className="w-5 h-5 text-brand-400 animate-spin" />
        </div>
      </div>

      {/* Auto-save note */}
      <div className="info-box-green px-4 py-2.5 mb-4">
        <p className="text-xs text-brand-300/90">
          Progress saved after each section. Resume anytime if interrupted.
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative mb-2">
        {/* Track */}
        <div className="glass-inner rounded-full h-3.5 overflow-hidden">
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, #15803d, #16a34a, #4ade80)',
              boxShadow: '0 0 12px rgba(74, 222, 128, 0.2), 0 0 4px rgba(74, 222, 128, 0.3) inset',
            }}
          >
            <div className="absolute inset-0 progress-shimmer" />
          </div>
        </div>

        {/* Percentage badge */}
        <div className="absolute -top-0.5 right-0 text-xs font-semibold text-surface-300 tabular-nums">
          {percentage}%
        </div>
      </div>

      {/* Section counter */}
      <p className="text-xs text-surface-500 text-center mb-5 tabular-nums">
        {progress.current} of {progress.total} sections completed
      </p>

      {/* Debug Log */}
      <DebugLog logs={debugLog} showPulse />
    </div>
  );
}

export default ProcessingView;
