/**
 * =============================================================================
 * DEBUG LOG COMPONENT
 * =============================================================================
 *
 * Displays a scrollable list of timestamped log entries.
 *
 * PROPS:
 * ------
 * @param {Array} logs - Array of log entry objects
 * @param {string} title - Header text (default: "Debug Log")
 * @param {boolean} showPulse - Show animated green dot indicator (default: false)
 *
 * =============================================================================
 */

import React from 'react';

/**
 * Timestamped debug log display.
 */
function DebugLog({ logs, title = 'Debug Log', showPulse = false }) {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="bg-surface-900/70 border border-surface-700/30 rounded-xl p-4 max-h-72 overflow-y-auto">
      <h3 className="text-xs font-semibold text-surface-400 mb-2.5 flex items-center uppercase tracking-wider">
        {showPulse && (
          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 animate-pulse-soft" />
        )}
        {title}
      </h3>

      <div className="space-y-1">
        {logs.map((log, index) => (
          <div
            key={`${log.timestamp}-${index}`}
            className={`text-xs font-mono leading-relaxed ${
              log.type === 'error' ? 'text-red-400/90' : 'text-surface-400'
            }`}
          >
            <span className="text-surface-600 select-none">[{log.timestamp}]</span>{' '}
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DebugLog;
