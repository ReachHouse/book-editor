/**
 * =============================================================================
 * PROCESSING VIEW COMPONENT
 * =============================================================================
 *
 * Displays the editing progress while the document is being processed.
 * Shows a step indicator, progress bar, status messages, and a debug log.
 *
 * PROPS:
 * ------
 * @param {Object} progress - Progress state object (current, total, stage)
 * @param {Array} debugLog - Array of log entries
 *
 * =============================================================================
 */

import React from 'react';
import { FileText, PenTool, CheckCircle, Loader } from 'lucide-react';
import DebugLog from './DebugLog';

/**
 * Derive the current processing phase from the stage string.
 * Returns 0 (preparing), 1 (editing), or 2 (finalizing).
 */
function getPhase(stage) {
  if (!stage) return 0;
  const s = stage.toLowerCase();
  if (s.includes('finaliz')) return 2;
  if (s.includes('editing') || s.includes('processing')) return 1;
  return 0;
}

const STEPS = [
  { label: 'Preparing', Icon: FileText },
  { label: 'Editing', Icon: PenTool },
  { label: 'Complete', Icon: CheckCircle },
];

/**
 * Processing progress display with step indicator and debug log.
 */
function ProcessingView({ progress, debugLog }) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const phase = getPhase(progress.stage);

  return (
    <div className="glass-card p-6 sm:p-8 mb-8 animate-fade-in-up">
      {/* Header - px-2 matches step indicator padding for alignment */}
      <div className="flex items-center justify-between mb-5 px-2">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Processing Manuscript</h2>
          <p className="text-sm text-surface-400">{progress.stage}</p>
        </div>
        <div className="w-9 h-9 rounded-lg glass-icon flex items-center justify-center">
          <Loader className="w-4 h-4 text-brand-400 animate-spin" />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6 px-2">
        {STEPS.map((step, idx) => {
          const isActive = idx === phase;
          const isDone = idx < phase;
          const Icon = step.Icon;

          return (
            <React.Fragment key={step.label}>
              {/* Connector line before step (skip first) */}
              {idx > 0 && (
                <div className={`flex-1 h-px mx-2 transition-colors duration-500 ${
                  isDone ? 'bg-brand-500/40' : 'bg-surface-700/40'
                }`} />
              )}

              {/* Step */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`
                  w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-500
                  ${isDone
                    ? 'bg-brand-600/20 border border-brand-500/20'
                    : isActive
                      ? 'glass-icon'
                      : 'bg-surface-800/40 border border-surface-700/20'
                  }
                `}>
                  <Icon className={`w-4 h-4 transition-colors duration-500 ${
                    isDone
                      ? 'text-brand-400'
                      : isActive
                        ? 'text-brand-400'
                        : 'text-surface-600'
                  }`} />
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-500 ${
                  isDone || isActive ? 'text-surface-300' : 'text-surface-600'
                }`}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Auto-save note */}
      <div className="info-box-green px-4 py-2.5 mb-4">
        <p className="text-xs text-brand-300/90">
          Progress saved after each section. Resume anytime if interrupted.
        </p>
      </div>

      {/* Progress bar with percentage */}
      <div className="flex items-center gap-3 mb-2">
        {/* Track */}
        <div
          className="flex-1 glass-inner rounded-full h-3.5 overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Editing progress: ${progress.current} of ${progress.total} sections completed`}
        >
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden progress-fill"
            style={{ width: `${percentage}%` }}
            aria-hidden="true"
          >
            <div className="absolute inset-0 progress-shimmer" />
          </div>
        </div>

        {/* Percentage */}
        <span className="text-xs text-surface-500 tabular-nums w-8 text-right" aria-hidden="true">
          {percentage}%
        </span>
      </div>

      {/* Section counter */}
      <p className="text-xs text-surface-500 text-center mb-5 tabular-nums">
        {progress.current} of {progress.total} sections completed
      </p>

      {/* Debug Log */}
      <DebugLog logs={debugLog} showPulse title="Activity Log" />
    </div>
  );
}

export default ProcessingView;
