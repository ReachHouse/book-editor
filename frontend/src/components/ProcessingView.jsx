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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Processing Manuscript</h2>
          <p className="text-surface-400 text-sm">{progress.stage}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center">
          <Loader className="w-5 h-5 text-brand-400 animate-spin" />
        </div>
      </div>

      {/* Auto-save note */}
      <div className="info-box-green px-4 py-2.5 mb-5">
        <p className="text-xs text-brand-300/80">
          Progress saved after each section. Resume anytime if interrupted.
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative mb-2">
        {/* Track */}
        <div className="bg-surface-900/70 rounded-full h-3 overflow-hidden border border-surface-700/40">
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, #15803d, #16a34a, #4ade80)',
            }}
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 progress-shimmer" />
          </div>
        </div>

        {/* Percentage badge */}
        <div className="absolute -top-0.5 right-0 text-xs font-semibold text-surface-300 tabular-nums">
          {percentage}%
        </div>
      </div>

      {/* Section counter */}
      <p className="text-xs text-surface-500 text-center mb-6 tabular-nums">
        {progress.current} of {progress.total} sections completed
      </p>

      {/* Debug Log */}
      <DebugLog logs={debugLog} showPulse />
    </div>
  );
}

export default ProcessingView;
