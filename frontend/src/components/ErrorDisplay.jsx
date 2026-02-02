/**
 * Error Display Component
 * Shows error messages with optional debug log
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import DebugLog from './DebugLog';

function ErrorDisplay({ error, debugLog }) {
  if (!error) return null;

  return (
    <div className="bg-red-900/30 border border-red-500 rounded-xl p-5 mb-8 shadow-lg">
      <div className="flex items-start mb-4">
        <AlertCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-lg text-red-400">Error</p>
          <p className="text-sm text-gray-300 mt-1">{error}</p>
        </div>
      </div>

      {debugLog && debugLog.length > 0 && (
        <div className="mt-4">
          <DebugLog logs={debugLog} title="Debug Log:" />
        </div>
      )}
    </div>
  );
}

export default ErrorDisplay;
