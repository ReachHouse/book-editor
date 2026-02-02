/**
 * Header Component
 * Application header with title and style guide button
 */

import React from 'react';
import { FileText, BookOpen } from 'lucide-react';

function Header({ onShowStyleGuide }) {
  return (
    <div className="text-center mb-16">
      <div className="flex items-center justify-center mb-6">
        <FileText className="w-16 h-16 text-green-500" />
      </div>
      <h1 className="text-5xl font-bold mb-3">Professional Book Editor</h1>
      <p className="text-gray-400 text-lg mb-6">
        AI-powered manuscript editing with tracked changes
      </p>

      <button
        onClick={onShowStyleGuide}
        className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all hover:scale-105"
      >
        <BookOpen className="w-5 h-5" />
        View Reach Publishers Style Guide
      </button>
    </div>
  );
}

export default Header;
