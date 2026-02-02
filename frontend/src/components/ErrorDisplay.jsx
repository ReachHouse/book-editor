/**
 * =============================================================================
 * ERROR DISPLAY COMPONENT
 * =============================================================================
 *
 * Displays error messages with an optional debug log for troubleshooting.
 * Used throughout the application whenever an error needs to be shown.
 *
 * PROPS:
 * ------
 * @param {string} error - The error message to display
 * @param {Array} debugLog - Optional array of log entries for debugging
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ [!] Error                                                           │
 * │     Processing failed: API request timed out                        │
 * │                                                                     │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │ Debug Log:                                                      │ │
 * │ │ [12:34:56] Starting new document...                             │ │
 * │ │ [12:34:57] Extracted 45230 characters                           │ │
 * │ │ [12:34:58] Error: API request timed out                         │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * STYLING:
 * --------
 * - Red border and semi-transparent red background
 * - Red alert icon (AlertCircle from lucide-react)
 * - Error title in red, message in gray
 * - Debug log shown if available (uses DebugLog component)
 *
 * DEBUG LOG:
 * ----------
 * The debug log helps users and developers understand what happened
 * before the error occurred. It shows timestamped entries of operations
 * that were performed, making it easier to identify the failure point.
 *
 * NOTE:
 * -----
 * Returns null if error is falsy, so it can be safely included
 * in the render without conditional checks.
 *
 * =============================================================================
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import DebugLog from './DebugLog';

/**
 * Error message display with optional debug information.
 *
 * @param {Object} props - Component props
 * @param {string} props.error - Error message to display
 * @param {Array} props.debugLog - Optional log entries for debugging
 */
function ErrorDisplay({ error, debugLog }) {
  // Don't render anything if there's no error
  if (!error) return null;

  return (
    <div className="bg-red-900/30 border border-red-500 rounded-xl p-5 mb-8 shadow-lg">
      {/* Error Header with Icon */}
      <div className="flex items-start mb-4">
        {/* Alert Icon */}
        <AlertCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />

        {/* Error Text */}
        <div className="flex-1">
          <p className="font-semibold text-lg text-red-400">Error</p>
          <p className="text-sm text-gray-300 mt-1">{error}</p>
        </div>
      </div>

      {/* Debug Log (if available) */}
      {debugLog && debugLog.length > 0 && (
        <div className="mt-4">
          <DebugLog logs={debugLog} title="Debug Log:" />
        </div>
      )}
    </div>
  );
}

export default ErrorDisplay;
