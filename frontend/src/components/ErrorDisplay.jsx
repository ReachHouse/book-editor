/**
 * =============================================================================
 * ERROR DISPLAY COMPONENT
 * =============================================================================
 *
 * Displays error messages with an optional debug log for troubleshooting.
 *
 * PROPS:
 * ------
 * @param {string} error - The error message to display
 * @param {Array} debugLog - Optional array of log entries for debugging
 *
 * =============================================================================
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import DebugLog from './DebugLog';

/**
 * Error message display with optional debug information.
 */
function ErrorDisplay({ error, debugLog }) {
  if (!error) return null;

  return (
    <div role="alert" className="info-box-red p-4 mb-8 animate-fade-in-down">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg glass-icon-error flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
        </div>
        <div className="flex-1 pt-1">
          <p className="font-semibold text-red-300 text-sm">Error</p>
          <p className="text-sm text-surface-300 mt-1 leading-relaxed">{error}</p>
        </div>
      </div>

      {debugLog && debugLog.length > 0 && (
        <div className="mt-4">
          <DebugLog logs={debugLog} title="Debug Log" />
        </div>
      )}
    </div>
  );
}

export default ErrorDisplay;
