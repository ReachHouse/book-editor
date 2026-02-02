/**
 * =============================================================================
 * DOCUMENT ANALYSIS COMPONENT
 * =============================================================================
 *
 * Displays document metadata after a file is uploaded, before editing begins.
 * This is the "preview" step where users can see what they're about to edit
 * and choose to proceed or cancel.
 *
 * PROPS:
 * ------
 * @param {Object} analysis - Document metadata object containing:
 *   - fileName: string      - Name of the uploaded file
 *   - fileSize: string      - Formatted file size (e.g., "1.25 MB")
 *   - wordCount: string     - Formatted word count (e.g., "45,230")
 *   - paragraphs: string    - Formatted paragraph count (e.g., "342")
 *   - language: string      - Detected language (e.g., "English")
 *   - estimatedTime: string - Processing time estimate (e.g., "15 - 20 minutes")
 *   - estimatedChunks: number - Number of chunks for processing
 *
 * @param {function} onStartEditing - Callback when user clicks "Start Editing"
 * @param {function} onCancel - Callback when user clicks "Cancel"
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ [✓] Document Analysis                                               │
 * │                                                                     │
 * │  ┌──────────────┐  ┌──────────────┐                                │
 * │  │ File Name    │  │ File Size    │                                │
 * │  │ document.docx│  │ 1.25 MB      │                                │
 * │  └──────────────┘  └──────────────┘                                │
 * │  ┌──────────────┐  ┌──────────────┐                                │
 * │  │ Word Count   │  │ Paragraphs   │                                │
 * │  │ 45,230       │  │ 342          │                                │
 * │  └──────────────┘  └──────────────┘                                │
 * │  ┌──────────────┐  ┌──────────────┐                                │
 * │  │ Language     │  │ Est. Time    │                                │
 * │  │ English      │  │ 15-20 min    │                                │
 * │  └──────────────┘  └──────────────┘                                │
 * │                                                                     │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │ Document will be processed in 23 sections                   │   │
 * │  │ Follows Reach Publishers House Style Guide (UK English)     │   │
 * │  │ Auto-retry on failures (up to 3 attempts per section)       │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                                                                     │
 * │  [    Start Editing    ]  [ Cancel ]                               │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * WORKFLOW:
 * ---------
 * 1. User uploads a document → App.jsx analyzes it
 * 2. This component displays the analysis results
 * 3. User clicks "Start Editing" → onStartEditing called → processing begins
 * 4. User clicks "Cancel" → onCancel called → returns to upload screen
 *
 * =============================================================================
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Document analysis display with start/cancel actions.
 *
 * @param {Object} props - Component props
 * @param {Object} props.analysis - Document metadata from App.jsx analysis
 * @param {function} props.onStartEditing - Start the editing process
 * @param {function} props.onCancel - Cancel and return to upload screen
 */
function DocumentAnalysis({ analysis, onStartEditing, onCancel }) {
  return (
    <div className="bg-gray-800 rounded-xl p-8 mb-8 shadow-xl">
      {/* Header with checkmark icon */}
      <h2 className="text-3xl font-bold mb-6 flex items-center">
        <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
        Document Analysis
      </h2>

      {/* Metadata Grid - 2 columns of analysis items */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <AnalysisItem label="File Name" value={analysis.fileName} />
        <AnalysisItem label="File Size" value={analysis.fileSize} />
        <AnalysisItem label="Word Count" value={analysis.wordCount} />
        <AnalysisItem label="Paragraphs" value={analysis.paragraphs} />
        <AnalysisItem label="Language" value={analysis.language} />
        <AnalysisItem label="Estimated Time" value={analysis.estimatedTime} />
      </div>

      {/* Processing Information Box */}
      <div className="bg-green-900/20 border border-green-500 rounded-lg p-5 mb-6">
        <p className="text-sm text-green-400 leading-relaxed">
          Document will be processed in <strong>{analysis.estimatedChunks} sections</strong>
          <br />
          Follows <strong>Reach Publishers House Style Guide</strong> (UK English)
          <br />
          Auto-retry on failures (up to 3 attempts per section)
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {/* Primary Action - Start Editing */}
        <button
          onClick={onStartEditing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg transition-all hover:scale-105 shadow-lg text-lg"
        >
          Start Editing
        </button>

        {/* Secondary Action - Cancel */}
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

/**
 * Individual analysis item display.
 * Shows a label and value in a styled card.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - The label text (e.g., "Word Count")
 * @param {string} props.value - The value to display (e.g., "45,230")
 */
function AnalysisItem({ label, value }) {
  return (
    <div className="bg-gray-700 p-4 rounded-lg">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="font-semibold text-lg">{value}</p>
    </div>
  );
}

export default DocumentAnalysis;
