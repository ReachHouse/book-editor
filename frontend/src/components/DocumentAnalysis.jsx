/**
 * =============================================================================
 * DOCUMENT ANALYSIS COMPONENT
 * =============================================================================
 *
 * Displays document metadata after a file is uploaded, before editing begins.
 *
 * PROPS:
 * ------
 * @param {Object} analysis - Document metadata object
 * @param {function} onStartEditing - Callback when user clicks "Start Editing"
 * @param {function} onCancel - Callback when user clicks "Cancel"
 *
 * =============================================================================
 */

import React from 'react';
import { CheckCircle, FileText, Hash, AlignLeft, Globe, Clock, Layers } from 'lucide-react';

const ANALYSIS_FIELDS = [
  { key: 'fileName', label: 'File Name', icon: FileText },
  { key: 'fileSize', label: 'File Size', icon: Hash },
  { key: 'wordCount', label: 'Words', icon: AlignLeft },
  { key: 'paragraphs', label: 'Paragraphs', icon: Layers },
  { key: 'language', label: 'Language', icon: Globe },
  { key: 'estimatedTime', label: 'Est. Time', icon: Clock },
];

/**
 * Document analysis display with start/cancel actions.
 */
function DocumentAnalysis({ analysis, onStartEditing, onCancel }) {
  return (
    <div className="glass-card p-6 sm:p-8 mb-8 animate-scale-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Document Analysis</h2>
          <p className="text-sm text-surface-400">Review details before editing</p>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 stagger-children">
        {ANALYSIS_FIELDS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="bg-surface-900/50 border border-surface-700/40 rounded-xl p-3.5 group hover:border-surface-600/60 transition-colors duration-200"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="w-3.5 h-3.5 text-surface-500 group-hover:text-brand-400 transition-colors" />
              <p className="text-surface-500 text-xs font-medium uppercase tracking-wider">{label}</p>
            </div>
            <p className="font-semibold text-surface-200 text-sm truncate">{analysis[key]}</p>
          </div>
        ))}
      </div>

      {/* Processing info */}
      <div className="info-box-green p-4 mb-6">
        <p className="text-sm text-brand-300/90 leading-relaxed">
          Document will be processed in <strong className="text-brand-300">{analysis.estimatedChunks} sections</strong>
          <span className="mx-1.5 text-brand-600">&#183;</span>
          Follows <strong className="text-brand-300">Reach Publishers House Style Guide</strong> (UK English)
          <span className="mx-1.5 text-brand-600">&#183;</span>
          Auto-retry on failures (up to 3 attempts per section)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onStartEditing}
          className="btn-primary flex-1 py-3.5 px-6 text-base focus-ring"
        >
          Start Editing
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary py-3.5 px-6 text-base focus-ring"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default DocumentAnalysis;
