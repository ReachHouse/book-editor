/**
 * Debug Log Component
 * Displays processing logs with timestamps
 */

import React from 'react';

function DebugLog({ logs, title = 'Debug Log', showPulse = false }) {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-5 max-h-80 overflow-y-auto">
      <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
        {showPulse && (
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
        )}
        {title}
      </h3>
      {logs.map((log, index) => (
        <div
          key={index}
          className={`text-xs mb-2 font-mono ${
            log.type === 'error' ? 'text-red-400' : 'text-gray-300'
          }`}
        >
          <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
        </div>
      ))}
    </div>
  );
}

export default DebugLog;
