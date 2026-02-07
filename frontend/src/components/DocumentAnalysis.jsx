/** DocumentAnalysis — Document metadata display shown before editing begins. */

import React, { useState } from 'react';
import { CheckCircle, FileText, Hash, AlignLeft, Globe, Clock, Layers, Lock, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ANALYSIS_FIELDS = [
  { key: 'fileName', label: 'File Name', icon: FileText },
  { key: 'fileSize', label: 'File Size', icon: Hash },
  { key: 'wordCount', label: 'Words', icon: AlignLeft },
  { key: 'paragraphs', label: 'Paragraphs', icon: Layers },
  { key: 'language', label: 'Language', icon: Globe },
  { key: 'estimatedTime', label: 'Est. Time', icon: Clock },
];

function DocumentAnalysis({ analysis, onStartEditing, onCancel }) {
  const { isGuest, logout } = useAuth();
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  const handleStartEditing = () => {
    if (isGuest) {
      setShowRegisterPrompt(true);
      return;
    }
    onStartEditing();
  };

  const handleSignIn = () => {
    // Clear guest mode and redirect to login
    logout();
  };

  return (
    <div className="glass-card p-6 sm:p-8 mb-8 animate-scale-in">
      {/* Register prompt modal for guests */}
      {showRegisterPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card p-6 max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-200" />
                </div>
                <h3 className="text-lg font-semibold text-white">Account Required</h3>
              </div>
              <button
                onClick={() => setShowRegisterPrompt(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-surface-400 mb-6 leading-relaxed">
              You need an account to edit documents. Sign in or register with an invite code to start editing.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSignIn}
                className="btn-primary flex-1 py-2.5 px-4 text-sm"
              >
                Sign In / Register
              </button>
              <button
                onClick={() => setShowRegisterPrompt(false)}
                className="btn-secondary py-2.5 px-4 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl glass-icon flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Document Analysis</h2>
          <p className="text-sm text-surface-400">Review details before editing</p>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 stagger-children">
        {ANALYSIS_FIELDS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="glass-inner p-4 group hover:border-surface-600/15 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-surface-500 group-hover:text-brand-400 transition-colors" />
              <p className="text-surface-500 text-xs font-medium uppercase tracking-wider">{label}</p>
            </div>
            <p className="font-semibold text-surface-200 text-sm truncate" title={String(analysis[key])}>{analysis[key]}</p>
          </div>
        ))}
      </div>

      {/* Processing info */}
      <div className="info-box-green p-4 mb-6">
        <p className="text-sm text-brand-300/90 leading-relaxed">
          Document will be processed in <strong className="text-brand-300">{analysis.estimatedChunks} sections</strong>
          <span className="mx-1.5 text-brand-600">&#183;</span>
          Follows <strong className="text-brand-300">Reach House Style Guide</strong> (UK English)
          <span className="mx-1.5 text-brand-600">&#183;</span>
          Auto-retry on failures (up to 3 attempts per section)
        </p>
      </div>

      {/* Guest info box */}
      {isGuest && (
        <div className="info-box-amber p-4 mb-6 flex items-center gap-3">
          <Lock className="w-4 h-4 text-amber-200 shrink-0" />
          <p className="text-sm text-amber-200">
            You&apos;re viewing as a guest. <strong className="text-amber-200">Register to start editing.</strong>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleStartEditing}
          className="btn-primary flex-1 py-3 px-5 text-sm focus-ring"
        >
          {isGuest ? 'Start Editing (requires account)' : 'Start Editing'}
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary py-3 px-5 text-sm focus-ring"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default DocumentAnalysis;
