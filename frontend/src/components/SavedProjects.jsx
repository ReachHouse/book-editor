/** SavedProjects — List of previously edited books with download/resume/delete actions. */

import React, { useState } from 'react';
import { Clock, Download, Play, Trash2, Check, X, Loader, FileText, CheckCircle, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function SavedProjects({
  projects,
  onDownload,
  onResume,
  onDelete,
  isDownloading
}) {
  const { isGuest, logout } = useAuth();
  const hasProjects = projects && projects.length > 0;

  // Show guest message instead of projects list
  if (isGuest) {
    return (
      <div className="glass-card p-6 sm:p-8 animate-fade-in-up [animation-delay:100ms]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl glass-icon-neutral flex items-center justify-center">
            <Clock className="w-5 h-5 text-surface-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Previously Edited Books</h2>
            <p className="text-sm text-surface-400">Sign in to save and access your projects</p>
          </div>
        </div>

        {/* Guest message */}
        <div className="glass-inner p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-surface-800/50 border border-surface-700/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-surface-500" aria-hidden="true" />
          </div>
          <p className="text-surface-300 text-sm mb-1">Your projects will appear here after you register</p>
          <p className="text-surface-500 text-xs mb-4">
            Sign in to save and resume your editing projects
          </p>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in or Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 animate-fade-in-up [animation-delay:100ms]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl glass-icon-neutral flex items-center justify-center">
          <Clock className="w-5 h-5 text-surface-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Previously Edited Books</h2>
          <p className="text-sm text-surface-400">
            {hasProjects ? 'Download or resume previous edits' : 'Your edited books will appear here'}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {!hasProjects && (
        <div className="glass-inner p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-surface-800/50 border border-surface-700/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-surface-500" aria-hidden="true" />
          </div>
          <p className="text-surface-400 text-sm mb-1">No projects yet</p>
          <p className="text-surface-500 text-xs">
            Upload a Word document above to get started with AI-powered editing.
          </p>
        </div>
      )}

      {/* Project List */}
      {hasProjects && (
        <div className="space-y-2">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              onDownload={onDownload}
              onResume={onResume}
              onDelete={onDelete}
              isDownloading={isDownloading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual project item with status badge, mini progress bar, and action buttons.
 * Includes inline delete confirmation to prevent accidental data loss.
 */
function ProjectItem({ project, onDownload, onResume, onDelete, isDownloading }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const progressPercent = project.totalChunks > 0
    ? Math.round((project.chunksCompleted / project.totalChunks) * 100)
    : 0;

  const handleConfirmDelete = async () => {
    if (isDeleting) return; // Prevent double-click
    setIsDeleting(true);
    try {
      await onDelete(project.id);
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="group glass-inner p-4 flex items-center justify-between hover:border-surface-600/15 transition-all duration-300">
      {/* Info */}
      <div className="flex items-start gap-3 flex-1 min-w-0 mr-4">
        {/* File icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
          project.isComplete
            ? 'bg-brand-600/15 border border-brand-500/15'
            : 'bg-teal-500/15 border border-teal-500/15'
        }`}>
          {project.isComplete
            ? <CheckCircle className="w-3.5 h-3.5 text-brand-400" />
            : <FileText className="w-3.5 h-3.5 text-teal-200" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {/* Filename + status badge */}
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium text-surface-200 text-sm truncate" title={project.fileName}>
              {project.fileName}
            </p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
              project.isComplete
                ? 'bg-brand-600/15 text-brand-400 border border-brand-500/15'
                : 'bg-blue-600/15 text-teal-200 border border-blue-500/15'
            }`}>
              {project.isComplete ? 'Ready' : 'In Progress'}
            </span>
          </div>

          {/* Status detail */}
          <p className="text-xs text-surface-500 mt-1">
            {project.isComplete ? (
              <span>Completed {new Date(project.timestamp).toLocaleString()}</span>
            ) : (
              <span className="tabular-nums">
                {project.chunksCompleted}/{project.totalChunks} sections ({progressPercent}%)
              </span>
            )}
          </p>

          {/* Mini progress bar for in-progress projects */}
          {!project.isComplete && (
            <div className="mt-2 h-1 rounded-full bg-surface-800/60 overflow-hidden max-w-[200px]">
              <div
                className="h-full rounded-full bg-teal-500/60 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {confirmingDelete ? (
        <div className="flex gap-2 flex-shrink-0 items-center" aria-live="polite">
          <span className="text-xs text-surface-400 mr-1">
            {isDeleting ? 'Deleting...' : 'Delete?'}
          </span>
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition-all duration-200 disabled:opacity-50 focus-ring"
            aria-label="Confirm delete"
          >
            {isDeleting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            disabled={isDeleting}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-700/60 hover:bg-surface-600/80 active:scale-95 text-surface-400 hover:text-white transition-all duration-200 disabled:opacity-50 focus-ring"
            aria-label="Cancel delete"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2 flex-shrink-0">
          {project.isComplete && (
            <button
              onClick={() => onDownload(project)}
              disabled={isDownloading}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-600/80 hover:bg-brand-500 active:scale-95 text-white transition-all duration-200 disabled:opacity-40 focus-ring"
              title="Download Word document with Track Changes"
              aria-label="Download Word document with Track Changes"
            >
              {isDownloading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          )}

          {!project.isComplete && (
            <button
              onClick={() => onResume(project)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white transition-all duration-200 focus-ring"
              title="Resume editing from where you left off"
              aria-label="Resume editing from where you left off"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-700/60 hover:bg-rose-600 active:scale-95 text-surface-400 hover:text-white transition-all duration-200 focus-ring"
            title="Delete from storage"
            aria-label="Delete from storage"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default SavedProjects;
