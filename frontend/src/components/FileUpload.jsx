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
 * =============================================================================
 */

import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';

/**
 * File upload component for Word document selection.
 *
 * @param {Object} props - Component props
 * @param {function} props.onFileSelect - Callback receiving the selected File object
 */
function FileUpload({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`
        relative rounded-2xl border-2 border-dashed p-12 sm:p-16 text-center
        transition-all duration-300 mb-8 animate-fade-in-up group cursor-pointer
        ${isDragging
          ? 'border-brand-400 bg-brand-600/10 shadow-glow-green'
          : 'border-surface-600/60 bg-surface-800/50 hover:border-brand-500/50 hover:bg-surface-800/70'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        type="file"
        accept=".doc,.docx"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />

      <label htmlFor="file-upload" className="cursor-pointer block">
        {/* Upload icon with animated ring */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className={`
            absolute inset-0 rounded-full transition-all duration-500
            ${isDragging
              ? 'bg-brand-500/15 scale-150'
              : 'bg-surface-700/30 scale-100 group-hover:bg-brand-600/10 group-hover:scale-125'
            }
          `} />
          <div className="relative w-16 h-16 flex items-center justify-center">
            <Upload className={`
              w-10 h-10 transition-all duration-300
              ${isDragging ? 'text-brand-400 -translate-y-1' : 'text-surface-400 group-hover:text-brand-400'}
            `} />
          </div>
        </div>

        {/* Primary text */}
        <p className="text-xl font-semibold mb-2 text-surface-200">
          Upload Your Manuscript
        </p>

        {/* Format info */}
        <p className="text-surface-400 text-sm mb-1.5">
          Drag and drop or click to browse
        </p>
        <div className="inline-flex items-center gap-1.5 text-surface-500 text-xs">
          <FileText className="w-3.5 h-3.5" />
          <span>Microsoft Word (.doc, .docx)</span>
        </div>
      </label>
    </div>
  );
}

export default FileUpload;
