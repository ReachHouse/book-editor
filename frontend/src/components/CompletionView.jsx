/**
 * Completion View Component
 * Shows success message and download options
 */

import React from 'react';
import { CheckCircle, Download, Loader } from 'lucide-react';

function CompletionView({
  onDownload,
  onEditAnother,
  isDownloading
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h2 className="text-4xl font-bold mb-3">Editing Complete!</h2>
        <p className="text-gray-400 text-lg">
          Manuscript professionally edited following Reach Publishers House Style Guide.
        </p>
      </div>

      <div className="bg-green-900/20 border border-green-500 rounded-lg p-5 mb-6">
        <p className="text-sm text-green-400 leading-relaxed">
          <strong>Auto-Saved:</strong> Accessible anytime from "Previously Edited Books"
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-5 mb-8">
        <p className="text-sm text-blue-400">
          <strong>Track Changes:</strong> Downloads as Word (.docx) with full change tracking
          <br />
          <span className="text-red-400">Red strikethrough</span> for deletions
          <br />
          <span className="text-blue-400">Blue underline</span> for insertions
          <br />
          Open in Microsoft Word to review/accept/reject changes.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all hover:scale-105 shadow-lg flex items-center justify-center text-lg"
        >
          {isDownloading ? (
            <>
              <Loader className="w-6 h-6 mr-3 animate-spin" />
              Generating Word Document...
            </>
          ) : (
            <>
              <Download className="w-6 h-6 mr-3" />
              Download Word Document
            </>
          )}
        </button>
        <button
          onClick={onEditAnother}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all"
        >
          Edit Another Book
        </button>
      </div>
    </div>
  );
}

export default CompletionView;
