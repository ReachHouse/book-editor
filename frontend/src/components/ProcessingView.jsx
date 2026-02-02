/**
 * Processing View Component
 * Shows progress while document is being edited
 */

import React from 'react';
import { Loader } from 'lucide-react';
import DebugLog from './DebugLog';

function ProcessingView({ progress, debugLog }) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-8 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Processing Manuscript</h2>
        <Loader className="w-8 h-8 text-green-500 animate-spin" />
      </div>

      <p className="text-gray-400 mb-2">{progress.stage}</p>
      <p className="text-sm text-green-400 mb-4">
        Progress saved after each section. Resume anytime if interrupted.
      </p>

      {/* Progress Bar */}
      <div className="bg-gray-700 rounded-full h-6 mb-3 overflow-hidden shadow-inner relative">
        <div
          className="bg-gradient-to-r from-green-600 to-green-500 h-full transition-all duration-500 absolute top-0 left-0"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-lg">
            {percentage}%
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-400 text-center mb-8">
        {progress.current} of {progress.total} sections completed
      </p>

      <DebugLog logs={debugLog} showPulse />
    </div>
  );
}

export default ProcessingView;
