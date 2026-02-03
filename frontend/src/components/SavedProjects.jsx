/**
 * =============================================================================
 * SAVED PROJECTS COMPONENT
 * =============================================================================
 *
 * Displays a list of previously edited books stored in localStorage.
 * Allows users to:
 * - Download completed edits as Word documents
 * - Resume incomplete editing sessions
 * - Delete projects from storage
 *
 * PROPS:
 * ------
 * @param {Array} projects - Array of project objects from useProjects hook
 * @param {function} onDownload - Callback to download a completed project
 * @param {function} onResume - Callback to resume an incomplete project
 * @param {function} onDelete - Callback to delete a project (receives projectId)
 * @param {boolean} isDownloading - True while a download is in progress
 *
 * PROJECT OBJECT STRUCTURE:
 * -------------------------
 * {
 *   id: string,              - Unique identifier (timestamp string)
 *   fileName: string,        - Original file name
 *   timestamp: number,       - Last modified time (Date.now())
 *   chunksCompleted: number, - Number of chunks processed
 *   totalChunks: number,     - Total chunks in document
 *   isComplete: boolean,     - True if all chunks processed
 *   originalText: string,    - Original document text
 *   fullEditedText: string,  - Complete edited text (only if complete)
 *   editedChunks: Array,     - Array of edited chunk strings
 *   styleGuide: string,      - Generated style guide for consistency
 *   docContent: Object       - Pre-prepared download content (optional)
 * }
 *
 * VISUAL LAYOUT:
 * --------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ [Clock] Previously Edited Books                                     │
 * │                                                                     │
 * │ Edited books are auto-saved. Download completed books or resume...  │
 * │                                                                     │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │ MyBook.docx                             [📥] [🗑]               │ │
 * │ │ Completed Feb 2, 2026 at 3:45 PM                                │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * │                                                                     │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │ AnotherBook.docx                        [▶] [🗑]                │ │
 * │ │ In progress: 5/12 sections (42%)                                │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * BUTTON MEANINGS:
 * ----------------
 * - 📥 (Download): Generate and download Word doc with Track Changes
 * - ▶  (Play): Resume editing from where it left off
 * - 🗑  (Trash): Delete project from localStorage
 *
 * STORAGE:
 * --------
 * Projects are stored in localStorage with keys prefixed by 'book_'.
 * See useProjects hook for storage implementation details.
 *
 * NOTE:
 * -----
 * This component returns null if there are no saved projects,
 * so it can be safely included in the render without conditional checks.
 *
 * =============================================================================
 */

import React from 'react';
import { Clock, Download, Play, Trash2, Loader, AlertTriangle } from 'lucide-react';
import { formatFileName } from '../utils/documentUtils';

/**
 * List of saved projects with actions.
 *
 * @param {Object} props - Component props
 * @param {Array} props.projects - Saved projects from useProjects hook
 * @param {function} props.onDownload - Download completed project
 * @param {function} props.onResume - Resume incomplete project
 * @param {function} props.onDelete - Delete project by ID
 * @param {boolean} props.isDownloading - Show loading state on download buttons
 * @param {Object} props.storageInfo - Storage usage info from useProjects hook
 */
function SavedProjects({
  projects,
  onDownload,
  onResume,
  onDelete,
  isDownloading,
  storageInfo
}) {
  // Don't render anything if no projects exist
  if (!projects || projects.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-8 shadow-xl">
      {/* Header */}
      <h2 className="text-3xl font-bold mb-6 flex items-center">
        <Clock className="w-8 h-8 text-green-500 mr-3" />
        Previously Edited Books
      </h2>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-6">
        Edited books are auto-saved. Download completed books or resume incomplete ones.
      </p>

      {/* Storage Warning Banner */}
      {storageInfo && storageInfo.isWarning && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 font-semibold">Storage Nearly Full</p>
            <p className="text-yellow-300/80 text-sm mt-1">
              Using {storageInfo.usedMB} MB of {storageInfo.limitMB} MB ({storageInfo.percentUsed}%).
              Delete old projects to free up space.
            </p>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="space-y-4">
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
 *
 * @param {Object} props - Component props
 * @param {Object} props.project - Project data object
 * @param {function} props.onDownload - Download callback
 * @param {function} props.onResume - Resume callback
 * @param {function} props.onDelete - Delete callback
 * @param {boolean} props.isDownloading - Loading state for download
 */
function ProjectItem({ project, onDownload, onResume, onDelete, isDownloading }) {
  // Calculate completion percentage for in-progress projects
  const progressPercent = Math.round(
    (project.chunksCompleted / project.totalChunks) * 100
  );

  /**
   * Prepare content for download and trigger the download callback.
   * Uses cached docContent if available, otherwise reconstructs from stored data.
   */
  const handleDownload = () => {
    const content = project.docContent || {
      original: project.originalText,
      edited: project.fullEditedText,
      fileName: formatFileName(project.fileName)
    };
    onDownload(content);
  };

  return (
    <div className="bg-gray-700 rounded-lg p-5 flex items-center justify-between hover:bg-gray-600 transition-colors">
      {/* Project Info */}
      <div className="flex-1 min-w-0">
        {/* File Name (truncated if too long) */}
        <p className="font-semibold text-white text-lg truncate">
          {project.fileName}
        </p>

        {/* Status Line */}
        <p className="text-sm text-gray-400 mt-1">
          {project.isComplete ? (
            // Completed: Show completion timestamp
            <span>Completed {new Date(project.timestamp).toLocaleString()}</span>
          ) : (
            // In Progress: Show chunk progress
            <span>
              In progress: {project.chunksCompleted}/{project.totalChunks} sections ({progressPercent}%)
            </span>
          )}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 ml-4">
        {/* Download Button - Only for completed projects */}
        {project.isComplete && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold p-3 rounded-lg transition-all hover:scale-105 shadow-lg"
            title="Download Word document with Track Changes"
          >
            {isDownloading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Resume Button - Only for incomplete projects */}
        {!project.isComplete && (
          <button
            onClick={() => onResume(project)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg transition-all hover:scale-105 shadow-lg"
            title="Resume editing from where you left off"
          >
            <Play className="w-5 h-5" />
          </button>
        )}

        {/* Delete Button - Always available */}
        <button
          onClick={() => onDelete(project.id)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold p-3 rounded-lg transition-all hover:scale-105 shadow-lg"
          title="Delete from storage"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default SavedProjects;
