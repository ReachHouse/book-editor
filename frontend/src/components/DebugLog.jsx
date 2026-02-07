/** DebugLog — Scrollable list of timestamped log entries. */

import React from 'react';
function DebugLog({ logs, title = 'Debug Log', showPulse = false }) {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="glass-inner p-4 max-h-72 overflow-y-auto" role="log" aria-label={title}>
      <h3 className="text-xs font-semibold text-surface-400 mb-2 flex items-center uppercase tracking-wider">
        {showPulse && (
          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2 animate-pulse-soft" />
        )}
        {title}
      </h3>

      <div className="space-y-1">
        {logs.map((log, index) => (
          <div
            key={log.id || `${log.timestamp}-${index}`}
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
