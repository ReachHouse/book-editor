/**
 * =============================================================================
 * SAVED PROJECTS COMPONENT
 * =============================================================================
 *
 * Displays a list of previously edited books stored in localStorage.
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

import React from 'react';
import { Clock, Download, Play, Trash2, Loader, AlertTriangle } from 'lucide-react';
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
    <div className="glass-card p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl glass-icon-neutral flex items-center justify-center">
          <Clock className="w-5 h-5 text-surface-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Previously Edited Books</h2>
          <p className="text-xs text-surface-500">Download completed books or resume incomplete ones</p>
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
 * Individual project item with status and action buttons.
 */
function ProjectItem({ project, onDownload, onResume, onDelete, isDownloading }) {
  const progressPercent = Math.round(
    (project.chunksCompleted / project.totalChunks) * 100
  );

  const handleDownload = () => {
    const content = project.docContent || {
      original: project.originalText,
      edited: project.fullEditedText,
      fileName: formatFileName(project.fileName)
    };
    onDownload(content);
  };

  return (
    <div className="group glass-inner p-4 flex items-center justify-between hover:border-surface-600/15 transition-all duration-300">
      {/* Info */}
      <div className="flex-1 min-w-0 mr-4">
        <p className="font-medium text-surface-200 text-sm truncate">
          {project.fileName}
        </p>
        <p className="text-xs text-surface-500 mt-0.5">
          {project.isComplete ? (
            <span>Completed {new Date(project.timestamp).toLocaleString()}</span>
          ) : (
            <span className="tabular-nums">
              In progress: {project.chunksCompleted}/{project.totalChunks} sections ({progressPercent}%)
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        {project.isComplete && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600/80 hover:bg-brand-500 text-white transition-all duration-200 disabled:opacity-40 focus-ring"
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
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white transition-all duration-200 focus-ring"
            title="Resume editing from where you left off"
            aria-label="Resume editing from where you left off"
          >
            <Play className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => onDelete(project.id)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-700/60 hover:bg-red-600/80 text-surface-400 hover:text-white transition-all duration-200 focus-ring"
          title="Delete from storage"
          aria-label="Delete from storage"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SavedProjects;
