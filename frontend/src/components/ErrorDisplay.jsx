/** ErrorDisplay — Error message with optional debug log. */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import DebugLog from './DebugLog';

function ErrorDisplay({ error, debugLog }) {
  if (!error) return null;

  return (
    <div role="alert" className="info-box-rose p-4 mb-8 animate-fade-in-down">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg glass-icon-error flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-200" aria-hidden="true" />
        </div>
        <div className="flex-1 pt-1">
          <p className="font-semibold text-rose-200 text-sm">Error</p>
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
