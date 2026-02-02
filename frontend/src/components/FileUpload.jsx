/**
 * File Upload Component
 * Handles document upload and initial validation
 */

import React from 'react';
import { Upload } from 'lucide-react';

function FileUpload({ onFileSelect }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 p-16 text-center hover:border-green-500 transition-all mb-8 shadow-xl">
      <input
        type="file"
        accept=".doc,.docx"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className="w-20 h-20 mx-auto mb-6 text-green-500" />
        <p className="text-2xl font-semibold mb-3">Upload Your Manuscript</p>
        <p className="text-gray-400 mb-2">Microsoft Word documents only (.doc, .docx)</p>
        <p className="text-gray-500 text-sm">
          Edits follow Reach Publishers House Style Guide (UK English)
        </p>
      </label>
    </div>
  );
}

export default FileUpload;
