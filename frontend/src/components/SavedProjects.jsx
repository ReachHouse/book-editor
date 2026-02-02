/**
 * Saved Projects Component
 * Displays list of previously edited books with resume/download options
 */

import React from 'react';
import { Clock, Download, Play, Trash2, Loader } from 'lucide-react';
import { formatFileName } from '../utils/documentUtils';

function SavedProjects({
  projects,
  onDownload,
  onResume,
  onDelete,
  isDownloading
}) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-8 shadow-xl">
      <h2 className="text-3xl font-bold mb-6 flex items-center">
        <Clock className="w-8 h-8 text-green-500 mr-3" />
        Previously Edited Books
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Edited books are auto-saved. Download completed books or resume incomplete ones.
      </p>

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
    <div className="bg-gray-700 rounded-lg p-5 flex items-center justify-between hover:bg-gray-600 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-lg truncate">
          {project.fileName}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {project.isComplete ? (
            <span>Completed {new Date(project.timestamp).toLocaleString()}</span>
          ) : (
            <span>
              In progress: {project.chunksCompleted}/{project.totalChunks} sections ({progressPercent}%)
            </span>
          )}
        </p>
      </div>

      <div className="flex gap-3 ml-4">
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

        {!project.isComplete && (
          <button
            onClick={() => onResume(project)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg transition-all hover:scale-105 shadow-lg"
            title="Resume editing from where you left off"
          >
            <Play className="w-5 h-5" />
          </button>
        )}

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
