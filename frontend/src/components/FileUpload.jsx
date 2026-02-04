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
        relative rounded-[1.25rem] border-2 border-dashed p-12 sm:p-16 text-center
        transition-all duration-500 ease-out mb-8 animate-fade-in-up group cursor-pointer
        backdrop-blur-sm
        ${isDragging
          ? 'border-brand-400/60 bg-brand-600/[0.08] shadow-[0_0_40px_-8px_rgba(74,222,128,0.15)]'
          : 'border-surface-600/30 bg-surface-800/30 hover:border-brand-500/30 hover:bg-surface-800/40'
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
            absolute inset-0 rounded-full transition-all duration-700 ease-out
            ${isDragging
              ? 'bg-brand-500/10 scale-[1.6]'
              : 'bg-surface-700/20 scale-100 group-hover:bg-brand-600/[0.07] group-hover:scale-[1.3]'
            }
          `} />
          <div className="relative w-16 h-16 flex items-center justify-center">
            <Upload className={`
              w-9 h-9 transition-all duration-500 ease-out
              ${isDragging ? 'text-brand-400 -translate-y-1.5' : 'text-surface-500 group-hover:text-brand-400'}
            `} />
          </div>
        </div>

        {/* Primary text */}
        <p className="text-lg font-semibold mb-2 text-surface-200">
          Upload Your Manuscript
        </p>

        {/* Format info */}
        <p className="text-surface-400 text-sm mb-2">
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
