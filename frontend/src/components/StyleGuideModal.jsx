/**
 * Style Guide Modal Component
 * Displays the full Reach Publishers style guide
 */

import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { FULL_STYLE_GUIDE_DOCUMENT } from '../constants';

function StyleGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-6 overflow-auto">
      <div
        className="bg-gray-800 rounded-xl w-full max-w-2xl my-auto shadow-2xl"
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700" style={{ flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-500" />
              Reach Publishers Style Guide
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 mb-4">
            <p className="text-xs text-green-400">
              <strong>Important:</strong> All edits strictly follow the Reach Publishers House Style Guide.
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <pre
              className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed"
              style={{ margin: 0 }}
            >
              {FULL_STYLE_GUIDE_DOCUMENT}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700" style={{ flexShrink: 0 }}>
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StyleGuideModal;
