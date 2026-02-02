/**
 * Document Analysis Component
 * Displays document metadata and starts the editing process
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';

function DocumentAnalysis({ analysis, onStartEditing, onCancel }) {
  return (
    <div className="bg-gray-800 rounded-xl p-8 mb-8 shadow-xl">
      <h2 className="text-3xl font-bold mb-6 flex items-center">
        <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
        Document Analysis
      </h2>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <AnalysisItem label="File Name" value={analysis.fileName} />
        <AnalysisItem label="File Size" value={analysis.fileSize} />
        <AnalysisItem label="Word Count" value={analysis.wordCount} />
        <AnalysisItem label="Paragraphs" value={analysis.paragraphs} />
        <AnalysisItem label="Language" value={analysis.language} />
        <AnalysisItem label="Estimated Time" value={analysis.estimatedTime} />
      </div>

      <div className="bg-green-900/20 border border-green-500 rounded-lg p-5 mb-6">
        <p className="text-sm text-green-400 leading-relaxed">
          Document will be processed in <strong>{analysis.estimatedChunks} sections</strong>
          <br />
          Follows <strong>Reach Publishers House Style Guide</strong> (UK English)
          <br />
          Auto-retry on failures (up to 3 attempts per section)
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onStartEditing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg transition-all hover:scale-105 shadow-lg text-lg"
        >
          Start Editing
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AnalysisItem({ label, value }) {
  return (
    <div className="bg-gray-700 p-4 rounded-lg">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="font-semibold text-lg">{value}</p>
    </div>
  );
}

export default DocumentAnalysis;
