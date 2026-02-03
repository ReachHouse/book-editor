/**
 * =============================================================================
 * DEBUG LOG COMPONENT
 * =============================================================================
 *
 * Displays a scrollable list of timestamped log entries.
 * Used in ProcessingView to show live progress and in ErrorDisplay to
 * show what operations occurred before an error.
 *
 * PROPS:
 * ------
 * @param {Array} logs - Array of log entry objects, each containing:
 *   - timestamp: string - Time the entry was created (e.g., "12:34:56")
 *   - message: string   - The log message text
 *   - type: string      - 'info' (gray text) or 'error' (red text)
 *
 * @param {string} title - Header text (default: "Debug Log")
 * @param {boolean} showPulse - Show animated green dot indicator (default: false)
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ● Debug Log                                   (● = pulsing green)   │
 * │ [12:34:56] Starting new document...                                 │
 * │ [12:34:57] Extracted 45230 characters                               │
 * │ [12:34:58] Created 10 sections                                      │
 * │ [12:35:01] Processing section 1/10                                  │
 * │ [12:35:15] Section 1 complete (2345 chars)                          │
 * │ [12:35:16] Processing section 2/10                                  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * STYLING:
 * --------
 * - Dark background (gray-900) for terminal-like appearance
 * - Monospace font for log entries
 * - Gray timestamps, white messages
 * - Red text for error-type entries
 * - Maximum height with scroll for long logs
 * - Optional pulsing green dot to indicate live activity
 *
 * USAGE:
 * ------
 * In ProcessingView (with pulse):
 *   <DebugLog logs={debugLog} showPulse />
 *
 * In ErrorDisplay (without pulse):
 *   <DebugLog logs={debugLog} title="Debug Log:" />
 *
 * LOG ENTRY CREATION:
 * -------------------
 * Log entries are created by the addLog function in App.jsx:
 *   const addLog = (message, type = 'info') => {
 *     const timestamp = new Date().toLocaleTimeString();
 *     setDebugLog(prev => [...prev, { timestamp, message, type }]);
 *   };
 *
 * NOTE:
 * -----
 * Returns null if logs is empty or undefined, so it can be safely
 * included in the render without conditional checks.
 *
 * =============================================================================
 */

import React from 'react';

/**
 * Timestamped debug log display.
 *
 * @param {Object} props - Component props
 * @param {Array} props.logs - Array of log entries
 * @param {string} props.title - Header text (default: "Debug Log")
 * @param {boolean} props.showPulse - Show live activity indicator
 */
function DebugLog({ logs, title = 'Debug Log', showPulse = false }) {
  // Don't render anything if no logs
  if (!logs || logs.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-5 max-h-80 overflow-y-auto">
      {/* Header with optional pulse indicator */}
      <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
        {/* Pulsing green dot (shown during active processing) */}
        {showPulse && (
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
        )}
        {title}
      </h3>

      {/* Log Entries */}
      {logs.map((log, index) => (
        <div
          key={`${log.timestamp}-${index}`}
          className={`text-xs mb-2 font-mono ${
            log.type === 'error' ? 'text-red-400' : 'text-gray-300'
          }`}
        >
          {/* Timestamp in dimmed gray */}
          <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
        </div>
      ))}
    </div>
  );
}

export default DebugLog;
