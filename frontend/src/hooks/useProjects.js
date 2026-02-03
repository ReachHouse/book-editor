/**
 * =============================================================================
 * USE PROJECTS HOOK
 * =============================================================================
 *
 * Custom React hook for managing book editing projects.
 * Uses IndexedDB for storage (50MB+ capacity) with localStorage fallback.
 *
 * PURPOSE:
 * --------
 * - Persist editing progress across browser sessions
 * - Allow users to resume interrupted edits
 * - Store completed projects for later download
 *
 * STORAGE:
 * --------
 * Primary: IndexedDB (50MB+ capacity, async, better for large documents)
 * Fallback: localStorage (5-10MB capacity, if IndexedDB unavailable)
 *
 * Automatic migration from localStorage to IndexedDB on first use.
 *
 * PROJECT STRUCTURE:
 * ------------------
 * {
 *   id: string,              - Unique identifier (timestamp string)
 *   fileName: string,        - Original file name
 *   timestamp: number,       - Last modified time (Date.now())
 *   chunksCompleted: number, - Number of chunks processed
 *   totalChunks: number,     - Total chunks in document
 *   chunkSize: number,       - Words per chunk (for resume compatibility)
 *   editedChunks: Array,     - Array of edited chunk strings
 *   originalText: string,    - Complete original document text
 *   styleGuide: string,      - Generated style guide for consistency
 *   isComplete: boolean,     - True if all chunks processed
 *   fullEditedText: string,  - Complete edited text (only if complete)
 *   docContent: Object       - Pre-prepared download content (optional)
 * }
 *
 * USAGE:
 * ------
 * import { useProjects } from './hooks/useProjects';
 *
 * function MyComponent() {
 *   const {
 *     savedProjects,    // Array of saved projects (sorted by timestamp)
 *     loading,          // True while initial load is in progress
 *     loadProjects,     // Function to reload the list
 *     saveProject,      // Function to save/update a project
 *     deleteProject,    // Function to delete by ID
 *     getProject,       // Function to get a single project by ID
 *     projectExists,    // Function to check if project exists
 *     storageInfo       // Storage usage info { usedMB, limitMB, percentUsed, isWarning, storageType }
 *   } = useProjects();
 * }
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

/**
 * Custom hook for managing book editing projects.
 *
 * @returns {Object} Project management functions and state
 */
export function useProjects() {
  // State: array of saved projects
  const [savedProjects, setSavedProjects] = useState([]);

  // State: true while loading from storage
  const [loading, setLoading] = useState(true);

  // State: storage usage information
  const [storageInfo, setStorageInfo] = useState({
    usedMB: '0.00',
    limitMB: '50',
    percentUsed: 0,
    isWarning: false,
    storageType: 'loading...'
  });

  /**
   * Load all saved projects from storage.
   * Updates both the project list and storage info.
   *
   * @returns {Promise<void>}
   */
  const loadProjects = useCallback(async () => {
    try {
      const projects = await storageService.getAllProjects();
      setSavedProjects(projects);

      const info = await storageService.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('Error loading saved projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save or update a project.
   *
   * @param {Object} projectData - Project data to save (must have 'id' field)
   * @throws {Error} If storage quota exceeded
   */
  const saveProject = useCallback(async (projectData) => {
    try {
      await storageService.saveProject(projectData);
      await loadProjects();
    } catch (err) {
      console.error('Failed to save project:', err);
      throw err;
    }
  }, [loadProjects]);

  /**
   * Delete a project by ID.
   *
   * @param {string} projectId - The ID of the project to delete
   * @throws {Error} If deletion fails
   */
  const deleteProject = useCallback(async (projectId) => {
    try {
      await storageService.deleteProject(projectId);
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  }, [loadProjects]);

  /**
   * Get a specific project by ID.
   *
   * @param {string} projectId - The ID of the project to retrieve
   * @returns {Promise<Object|null>} The project data, or null if not found
   */
  const getProject = useCallback(async (projectId) => {
    try {
      return await storageService.getProject(projectId);
    } catch (err) {
      console.error('Error getting project:', err);
      return null;
    }
  }, []);

  /**
   * Check if a project exists in storage.
   *
   * @param {string} projectId - The ID to check
   * @returns {Promise<boolean>} True if the project exists
   */
  const projectExists = useCallback(async (projectId) => {
    return await storageService.projectExists(projectId);
  }, []);

  // Initialize storage service and load projects on mount
  useEffect(() => {
    let mounted = true;

    const initAndLoad = async () => {
      await storageService.init();
      // Only update state if component is still mounted
      if (mounted) {
        await loadProjects();
      }
    };
    initAndLoad();

    // Cleanup: prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [loadProjects]);

  return {
    savedProjects,    // Array of saved projects
    loading,          // Loading state
    loadProjects,     // Reload the project list
    saveProject,      // Save or update a project
    deleteProject,    // Delete a project by ID
    getProject,       // Get a single project by ID (now async)
    projectExists,    // Check if a project exists (now async)
    storageInfo       // Storage usage info { usedMB, limitMB, percentUsed, isWarning, storageType }
  };
}

export default useProjects;
