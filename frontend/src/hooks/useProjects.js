/**
 * =============================================================================
 * USE PROJECTS HOOK
 * =============================================================================
 *
 * Custom React hook for managing book editing projects via server-side storage.
 *
 * PURPOSE:
 * --------
 * - Persist editing progress on the server (tied to user account)
 * - Allow users to resume interrupted edits from any device
 * - Store completed projects for later download
 *
 * STORAGE:
 * --------
 * All project data is stored server-side in SQLite via the /api/projects
 * endpoints. This replaces the previous client-side IndexedDB/localStorage
 * approach with persistent, user-scoped server storage.
 *
 * The list endpoint returns lightweight metadata (no text content).
 * Full project data is fetched on demand for resume/download.
 *
 * USAGE:
 * ------
 * import { useProjects } from './hooks/useProjects';
 *
 * function MyComponent() {
 *   const {
 *     savedProjects,    // Array of project metadata (sorted by timestamp)
 *     loading,          // True while initial load is in progress
 *     loadProjects,     // Function to reload the list from server
 *     saveProject,      // Function to save/update a project
 *     deleteProject,    // Function to delete by ID
 *     getProject,       // Function to get full project data by ID
 *   } = useProjects();
 * }
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import {
  listProjects,
  getProject as getProjectApi,
  saveProject as saveProjectApi,
  deleteProjectApi
} from '../services/api';

/**
 * Custom hook for managing book editing projects via server API.
 *
 * @returns {Object} Project management functions and state
 */
export function useProjects() {
  // State: array of saved project metadata
  const [savedProjects, setSavedProjects] = useState([]);

  // State: true while loading from server
  const [loading, setLoading] = useState(true);

  /**
   * Load all projects from the server (metadata only).
   *
   * @returns {Promise<void>}
   */
  const loadProjects = useCallback(async () => {
    try {
      const projects = await listProjects();
      setSavedProjects(projects);
    } catch (err) {
      console.error('Error loading saved projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save or update a project on the server.
   * Uses optimistic local update to avoid reloading the full list after each save.
   *
   * @param {Object} projectData - Project data to save (must have 'id' field)
   * @throws {Error} If save fails
   */
  const saveProject = useCallback(async (projectData) => {
    try {
      const result = await saveProjectApi(projectData);
      // Optimistically update local state instead of reloading full list
      // This avoids N API calls during editing (one per chunk save)
      setSavedProjects(prev => {
        const exists = prev.some(p => p.id === projectData.id);
        if (exists) {
          // Update existing project metadata
          return prev.map(p => p.id === projectData.id ? {
            ...p,
            ...result.project,
            timestamp: Date.now()
          } : p);
        } else {
          // Add new project at the beginning (most recent first)
          return [{
            id: projectData.id,
            fileName: projectData.fileName,
            isComplete: projectData.isComplete || false,
            chunksCompleted: projectData.chunksCompleted || 0,
            totalChunks: projectData.totalChunks || 0,
            chunkSize: projectData.chunkSize || 2000,
            timestamp: Date.now(),
            ...result.project
          }, ...prev];
        }
      });
    } catch (err) {
      console.error('Failed to save project:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a project by ID.
   * Uses optimistic local update to avoid reloading the full list.
   *
   * @param {string} projectId - The ID of the project to delete
   * @throws {Error} If deletion fails
   */
  const deleteProject = useCallback(async (projectId) => {
    // Optimistically remove from local state immediately
    setSavedProjects(prev => prev.filter(p => p.id !== projectId));
    try {
      await deleteProjectApi(projectId);
    } catch (err) {
      // On failure, reload the list to restore correct state
      console.error('Failed to delete project:', err);
      await loadProjects();
      throw err;
    }
  }, [loadProjects]);

  /**
   * Get full project data by ID (including text content).
   * Used for resume and download operations.
   *
   * @param {string} projectId - The ID of the project to retrieve
   * @returns {Promise<Object|null>} The full project data, or null if not found
   */
  const getProject = useCallback(async (projectId) => {
    try {
      return await getProjectApi(projectId);
    } catch (err) {
      console.error('Error getting project:', err);
      return null;
    }
  }, []);

  // Load projects on mount
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (mounted) {
        await loadProjects();
      }
    };
    load();

    return () => {
      mounted = false;
    };
  }, [loadProjects]);

  return {
    savedProjects,    // Array of project metadata
    loading,          // Loading state
    loadProjects,     // Reload the project list
    saveProject,      // Save or update a project
    deleteProject,    // Delete a project by ID
    getProject,       // Get full project data by ID (async)
  };
}

export default useProjects;
