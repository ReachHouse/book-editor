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
 * @param {Object} progress - Progress state object containing:
 *   - current: number  - Number of chunks completed
 *   - total: number    - Total number of chunks to process
 *   - stage: string    - Current operation description (e.g., "Editing section 3/10...")
 *
 * @param {Array} debugLog - Array of log entries, each with:
 *   - timestamp: string - Time of the log entry
 *   - message: string   - Log message
 *   - type: string      - 'info' or 'error'
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Processing Manuscript                               [Spinner Icon]  │
 * │                                                                     │
 * │ Editing section 3/10...                                             │
 * │ Progress saved after each section. Resume anytime if interrupted.   │
 * │                                                                     │
 * │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  30%                      │
 * │                                                                     │
 * │                    3 of 10 sections completed                       │
 * │                                                                     │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │ ● Debug Log                                                     │ │
 * │ │ [12:34:56] Starting new document...                             │ │
 * │ │ [12:34:57] Extracted 45230 characters                           │ │
 * │ │ [12:34:58] Created 10 sections                                  │ │
 * │ │ [12:35:01] Processing section 1/10                              │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * FEATURES:
 * ---------
 * - Animated spinner icon indicates active processing
 * - Gradient progress bar with percentage overlay
 * - Smooth transitions on progress updates (500ms duration)
 * - Debug log with pulsing indicator (green dot)
 * - Informational message about auto-save capability
 *
 * PROGRESS CALCULATION:
 * --------------------
 * percentage = Math.round((current / total) * 100)
 *
 * If total is 0 (edge case), percentage defaults to 0 to avoid division by zero.
 *
 * RESUME CAPABILITY:
 * ------------------
 * The message "Progress saved after each section" reminds users that:
 * - Progress is saved to localStorage after each chunk
 * - They can close the browser and resume later
 * - Interruptions won't lose all progress
 *
 * =============================================================================
 */

import React from 'react';
import { Loader } from 'lucide-react';
import DebugLog from './DebugLog';

/**
 * Processing progress display with debug log.
 *
 * @param {Object} props - Component props
 * @param {Object} props.progress - Progress state (current, total, stage)
 * @param {Array} props.debugLog - Array of log entries for debugging
 */
function ProcessingView({ progress, debugLog }) {
  // Calculate completion percentage (handle edge case of 0 total)
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-8 mb-8 shadow-xl">
      {/* Header Row with Title and Spinner */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Processing Manuscript</h2>
        <Loader className="w-8 h-8 text-green-500 animate-spin" />
      </div>

      {/* Current Stage Description */}
      <p className="text-gray-400 mb-2">{progress.stage}</p>

      {/* Auto-Save Reminder */}
      <p className="text-sm text-green-400 mb-4">
        Progress saved after each section. Resume anytime if interrupted.
      </p>

      {/* Progress Bar Container */}
      <div className="bg-gray-700 rounded-full h-6 mb-3 overflow-hidden shadow-inner relative">
        {/* Filled Progress Bar (gradient) */}
        <div
          className="bg-gradient-to-r from-green-600 to-green-500 h-full transition-all duration-500 absolute top-0 left-0"
          style={{ width: `${percentage}%` }}
        />
        {/* Percentage Text Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-lg">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Sections Completed Text */}
      <p className="text-sm text-gray-400 text-center mb-8">
        {progress.current} of {progress.total} sections completed
      </p>

      {/* Debug Log Component */}
      <DebugLog logs={debugLog} showPulse />
    </div>
  );
}

export default ProcessingView;
