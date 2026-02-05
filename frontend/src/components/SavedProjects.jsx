/**
 * =============================================================================
 * SAVED PROJECTS COMPONENT
 * =============================================================================
 *
 * Displays a list of previously edited books stored in IndexedDB (with localStorage fallback).
 *
 * PROPS:
 * ------
 * @param {Array} projects - Array of project objects from useProjects hook
 * @param {function} onDownload - Callback to download a completed project
 * @param {function} onResume - Callback to resume an incomplete project
 * @param {function} onDelete - Callback to delete a project (receives projectId)
 * @param {boolean} isDownloading - True while a download is in progress
 * @param {Object} storageInfo - Storage usage info from useProjects hook
 *
 * =============================================================================
 */

import React, { useState } from 'react';
import { Clock, Download, Play, Trash2, Check, X, Loader, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { formatFileName } from '../utils/documentUtils';

/**
 * List of saved projects with actions.
 */
function SavedProjects({
  projects,
  onDownload,
  onResume,
  onDelete,
  isDownloading,
  storageInfo
}) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="glass-card p-6 sm:p-8 animate-fade-in-up [animation-delay:100ms]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl glass-icon-neutral flex items-center justify-center">
          <Clock className="w-5 h-5 text-surface-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Previously Edited Books</h2>
          <p className="text-sm text-surface-400">Download or resume previous edits</p>
        </div>
      </div>

      {/* Storage Warning */}
      {storageInfo && storageInfo.isWarning && (
        <div className="info-box-amber p-3.5 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 font-semibold text-sm">Storage Nearly Full</p>
            <p className="text-amber-300/70 text-xs mt-0.5">
              Using {storageInfo.usedMB} MB of {storageInfo.limitMB} MB ({storageInfo.percentUsed}%).
              Delete old projects to free up space.
            </p>
          </div>
        </div>
      )}

      {/* Non-persistent storage warning */}
      {storageInfo && storageInfo.isPersistent === false && (
        <p className="text-xs text-surface-500 mb-4">
          Your browser may clear saved projects over time. Download completed books promptly.
        </p>
      )}

      {/* Project List */}
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
    </div>
  );
}

/**
 * Individual project item with status badge, mini progress bar, and action buttons.
 * Includes inline delete confirmation to prevent accidental data loss.
 */
function ProjectItem({ project, onDownload, onResume, onDelete, isDownloading }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const progressPercent = project.totalChunks > 0
    ? Math.round((project.chunksCompleted / project.totalChunks) * 100)
    : 0;

  const handleDownload = () => {
    const content = project.docContent || {
      original: project.originalText,
      edited: project.fullEditedText,
      fileName: formatFileName(project.fileName)
    };
    onDownload(content);
  };

  const handleConfirmDelete = () => {
    onDelete(project.id);
    setConfirmingDelete(false);
  };

  return (
    <div className="group glass-inner p-4 flex items-center justify-between hover:border-surface-600/15 transition-all duration-300">
      {/* Info */}
      <div className="flex items-start gap-3 flex-1 min-w-0 mr-4">
        {/* File icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
          project.isComplete
            ? 'bg-brand-600/15 border border-brand-500/15'
            : 'bg-blue-600/15 border border-blue-500/15'
        }`}>
          {project.isComplete
            ? <CheckCircle className="w-3.5 h-3.5 text-brand-400" />
            : <FileText className="w-3.5 h-3.5 text-blue-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {/* Filename + status badge */}
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium text-surface-200 text-sm truncate" title={project.fileName}>
              {project.fileName}
            </p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
              project.isComplete
                ? 'bg-brand-600/15 text-brand-400 border border-brand-500/15'
                : 'bg-blue-600/15 text-blue-400 border border-blue-500/15'
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
            <div className="mt-1.5 h-1 rounded-full bg-surface-800/60 overflow-hidden max-w-[200px]">
              <div
                className="h-full rounded-full bg-blue-500/60 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {confirmingDelete ? (
        <div className="flex gap-2 flex-shrink-0 items-center">
          <span className="text-xs text-surface-400 mr-1">Delete?</span>
          <button
            onClick={handleConfirmDelete}
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-red-600/80 hover:bg-red-500 active:scale-95 text-white transition-all duration-200 focus-ring"
            aria-label="Confirm delete"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-700/60 hover:bg-surface-600/80 active:scale-95 text-surface-400 hover:text-white transition-all duration-200 focus-ring"
            aria-label="Cancel delete"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2 flex-shrink-0">
          {project.isComplete && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-brand-600/80 hover:bg-brand-500 active:scale-95 text-white transition-all duration-200 disabled:opacity-40 focus-ring"
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
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-blue-600/80 hover:bg-blue-500 active:scale-95 text-white transition-all duration-200 focus-ring"
              title="Resume editing from where you left off"
              aria-label="Resume editing from where you left off"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-700/60 hover:bg-red-600/80 active:scale-95 text-surface-400 hover:text-white transition-all duration-200 focus-ring"
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
