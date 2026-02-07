/** FileUpload — Drag-and-drop upload area for Word documents. */

import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validateFile(file) {
  if (!file) return 'No file selected';

  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'doc' && ext !== 'docx') {
    return 'Please select a Word document (.doc or .docx)';
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / 1024 / 1024);
    return `File too large (${sizeMB}MB). Maximum size is 50MB.`;
  }

  return null;
}

function FileUpload({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileSelect(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
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
      handleFile(file);
    }
  };

  return (
    <div
      role="region"
      aria-label="File upload area — drag and drop a Word document or click to browse"
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
      {/* Hidden file input with focus styles passed to label */}
      <input
        type="file"
        accept=".doc,.docx"
        onChange={handleChange}
        className="sr-only peer"
        id="file-upload"
        aria-label="Upload Word document"
        aria-describedby={error ? 'file-upload-error' : undefined}
      />

      <label
        htmlFor="file-upload"
        className="cursor-pointer block rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-900"
      >
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
          <span>Microsoft Word (.doc, .docx) • Max 50MB</span>
        </div>
      </label>

      {/* Error message */}
      {error && (
        <div id="file-upload-error" className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
