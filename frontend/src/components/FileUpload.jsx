/**
 * =============================================================================
 * FILE UPLOAD COMPONENT
 * =============================================================================
 *
 * Provides a drag-and-drop style upload area for Word documents.
 * This is the first step in the editing workflow.
 *
 * PROPS:
 * ------
 * @param {function} onFileSelect - Callback when a file is selected
 *                                  Receives the File object as parameter
 *
 * SUPPORTED FORMATS:
 * ------------------
 * - .doc  (Microsoft Word 97-2003)
 * - .docx (Microsoft Word 2007+)
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │                         [Upload Icon]                               │
 * │                                                                     │
 * │                    Upload Your Manuscript                           │
 * │            Microsoft Word documents only (.doc, .docx)              │
 * │      Edits follow Reach Publishers House Style Guide (UK English)   │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * STYLING:
 * --------
 * - Dashed border that turns green on hover
 * - Large clickable area for ease of use
 * - Hidden file input with styled label overlay
 * - Responsive padding and sizing
 *
 * FLOW:
 * -----
 * 1. User clicks anywhere in the upload area
 * 2. Browser's native file picker opens (filtered to .doc/.docx)
 * 3. User selects a file
 * 4. handleChange extracts the File object
 * 5. onFileSelect callback is called with the file
 * 6. Parent component (App.jsx) handles validation and analysis
 *
 * NOTE:
 * -----
 * File format validation (.doc/.docx) happens in App.jsx, not here.
 * The accept attribute on the input is just a hint to the browser.
 *
 * =============================================================================
 */

import React from 'react';
import { Upload } from 'lucide-react';

/**
 * File upload component for Word document selection.
 *
 * @param {Object} props - Component props
 * @param {function} props.onFileSelect - Callback receiving the selected File object
 */
function FileUpload({ onFileSelect }) {
  /**
   * Handle file selection from the native file picker.
   * Extracts the first file and passes it to the parent component.
   */
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 p-16 text-center hover:border-green-500 transition-all mb-8 shadow-xl">
      {/* Hidden file input - triggered by the label */}
      <input
        type="file"
        accept=".doc,.docx"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />

      {/* Clickable label that triggers the file input */}
      <label htmlFor="file-upload" className="cursor-pointer">
        {/* Upload Icon */}
        <Upload className="w-20 h-20 mx-auto mb-6 text-green-500" />

        {/* Primary Text */}
        <p className="text-2xl font-semibold mb-3">Upload Your Manuscript</p>

        {/* Supported Formats */}
        <p className="text-gray-400 mb-2">Microsoft Word documents only (.doc, .docx)</p>

        {/* Style Guide Reference */}
        <p className="text-gray-500 text-sm">
          Edits follow Reach Publishers House Style Guide (UK English)
        </p>
      </label>
    </div>
  );
}

export default FileUpload;
