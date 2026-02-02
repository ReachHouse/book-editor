/**
 * =============================================================================
 * COMPLETION VIEW COMPONENT
 * =============================================================================
 *
 * Displayed when document editing is complete. Shows a success message
 * and provides options to download the edited document or start a new edit.
 *
 * PROPS:
 * ------
 * @param {function} onDownload - Callback to download the edited document
 * @param {function} onEditAnother - Callback to reset and upload a new document
 * @param {boolean} isDownloading - True while document generation is in progress
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                           [✓ Icon]                                  │
 * │                                                                     │
 * │                       Editing Complete!                             │
 * │     Manuscript professionally edited following Reach Publishers     │
 * │                        House Style Guide.                           │
 * │                                                                     │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │ Auto-Saved: Accessible anytime from "Previously Edited      │   │
 * │  │ Books"                                                      │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                                                                     │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │ Track Changes: Downloads as Word (.docx) with full tracking │   │
 * │  │ Red strikethrough for deletions                             │   │
 * │  │ Blue underline for insertions                               │   │
 * │  │ Open in Microsoft Word to review/accept/reject changes.     │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                                                                     │
 * │  [  📥 Download Word Document  ]  [ Edit Another Book ]            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * TRACK CHANGES EXPLANATION:
 * --------------------------
 * The blue information box explains the Track Changes format:
 * - Red strikethrough: Text that was deleted
 * - Blue underline: Text that was added
 * - Users can accept/reject individual changes in Microsoft Word
 *
 * DOWNLOAD PROCESS:
 * -----------------
 * 1. User clicks "Download Word Document"
 * 2. isDownloading becomes true, button shows spinner
 * 3. Backend generates .docx with Track Changes
 * 4. Browser downloads the file
 * 5. isDownloading becomes false, button returns to normal
 *
 * AUTO-SAVE NOTE:
 * ---------------
 * The green box reminds users that their completed edit is saved in
 * localStorage and can be accessed from the "Previously Edited Books"
 * section without re-uploading or re-processing.
 *
 * =============================================================================
 */

import React from 'react';
import { CheckCircle, Download, Loader } from 'lucide-react';

/**
 * Completion screen with download and reset options.
 *
 * @param {Object} props - Component props
 * @param {function} props.onDownload - Trigger document download
 * @param {function} props.onEditAnother - Reset to upload new document
 * @param {boolean} props.isDownloading - Show loading state during download
 */
function CompletionView({
  onDownload,
  onEditAnother,
  isDownloading
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-8 shadow-xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h2 className="text-4xl font-bold mb-3">Editing Complete!</h2>
        <p className="text-gray-400 text-lg">
          Manuscript professionally edited following Reach Publishers House Style Guide.
        </p>
      </div>

      {/* Auto-Save Information Box (Green) */}
      <div className="bg-green-900/20 border border-green-500 rounded-lg p-5 mb-6">
        <p className="text-sm text-green-400 leading-relaxed">
          <strong>Auto-Saved:</strong> Accessible anytime from "Previously Edited Books"
        </p>
      </div>

      {/* Track Changes Information Box (Blue) */}
      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-5 mb-8">
        <p className="text-sm text-blue-400">
          <strong>Track Changes:</strong> Downloads as Word (.docx) with full change tracking
          <br />
          {/* Visual examples of change formatting */}
          <span className="text-red-400">Red strikethrough</span> for deletions
          <br />
          <span className="text-blue-400">Blue underline</span> for insertions
          <br />
          Open in Microsoft Word to review/accept/reject changes.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {/* Primary Action - Download */}
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all hover:scale-105 shadow-lg flex items-center justify-center text-lg"
        >
          {isDownloading ? (
            // Loading State
            <>
              <Loader className="w-6 h-6 mr-3 animate-spin" />
              Generating Word Document...
            </>
          ) : (
            // Normal State
            <>
              <Download className="w-6 h-6 mr-3" />
              Download Word Document
            </>
          )}
        </button>

        {/* Secondary Action - Edit Another */}
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
