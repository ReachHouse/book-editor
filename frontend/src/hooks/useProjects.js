/**
 * =============================================================================
 * USE PROJECTS HOOK
 * =============================================================================
 *
 * Custom React hook for managing book editing projects in localStorage.
 * Provides CRUD operations for saving, loading, resuming, and deleting projects.
 *
 * PURPOSE:
 * --------
 * - Persist editing progress across browser sessions
 * - Allow users to resume interrupted edits
 * - Store completed projects for later download
 *
 * STORAGE FORMAT:
 * ---------------
 * Projects are stored in localStorage with keys prefixed by 'book_'.
 * Example: 'book_1707134400000' where the number is the project ID (timestamp).
 *
 * Each project is stored as a JSON string containing:
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
 *     projectExists     // Function to check if project exists
 *   } = useProjects();
 * }
 *
 * STORAGE LIMITATIONS:
 * --------------------
 * localStorage typically has a 5-10 MB limit per origin.
 * Large documents (100k+ words) may approach this limit.
 * If quota is exceeded, saveProject will throw an error.
 *
 * TODO: Consider using IndexedDB for larger storage capacity.
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Prefix for all project keys in localStorage.
 * Used to identify and filter project data from other stored items.
 */
const STORAGE_PREFIX = 'book_';

/**
 * Check if an error is a QuotaExceededError.
 * Different browsers use different names for this error.
 *
 * @param {Error} err - The error to check
 * @returns {boolean} True if it's a quota exceeded error
 */
function isQuotaExceededError(err) {
  return (
    err instanceof DOMException && (
      // Firefox
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      // Most browsers
      err.name === 'QuotaExceededError' ||
      // Safari
      err.code === 22
    )
  );
}

/**
 * Estimate current localStorage usage in bytes.
 *
 * @returns {number} Estimated bytes used
 */
function getStorageUsage() {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        // UTF-16: 2 bytes per character
        total += (key.length + value.length) * 2;
      }
    }
  }
  return total;
}

/**
 * Custom hook for managing book editing projects.
 *
 * @returns {Object} Project management functions and state
 */
export function useProjects() {
  // State: array of saved projects
  const [savedProjects, setSavedProjects] = useState([]);

  // State: true while loading from localStorage
  const [loading, setLoading] = useState(true);

  /**
   * Load all saved projects from localStorage.
   *
   * Iterates through all localStorage keys, finds those with our prefix,
   * parses the JSON data, and sorts by timestamp (newest first).
   *
   * @returns {Promise<void>}
   */
  const loadProjects = useCallback(async () => {
    try {
      // Find all keys that start with our prefix
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      const projects = [];

      // Parse each project
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            projects.push(JSON.parse(data));
          }
        } catch (err) {
          // Log but don't fail - one corrupted project shouldn't break everything
          console.error('Error loading project:', key, err);
        }
      }

      // Sort by timestamp, newest first
      setSavedProjects(projects.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.error('Error loading saved projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save or update a project in localStorage.
   *
   * The project is identified by its ID - if a project with the same ID
   * already exists, it will be overwritten.
   *
   * Handles QuotaExceededError by attempting to free space via deleting
   * old completed projects before reporting failure.
   *
   * @param {Object} projectData - Project data to save
   * @throws {Error} If localStorage quota exceeded and cannot free space
   */
  const saveProject = useCallback(async (projectData) => {
    const key = `${STORAGE_PREFIX}${projectData.id}`;
    const jsonData = JSON.stringify(projectData);

    const attemptSave = () => {
      localStorage.setItem(key, jsonData);
    };

    try {
      attemptSave();
      await loadProjects();
    } catch (err) {
      if (isQuotaExceededError(err)) {
        console.warn('localStorage quota exceeded, attempting to free space...');
        const usageBytes = getStorageUsage();
        console.warn(`Current usage: ${(usageBytes / 1024 / 1024).toFixed(2)} MB`);

        // Try to free space by deleting oldest completed projects (not the current one)
        const keys = Object.keys(localStorage)
          .filter(k => k.startsWith(STORAGE_PREFIX) && k !== key);

        // Sort by timestamp (oldest first) and filter to completed projects
        const oldProjects = keys
          .map(k => {
            try {
              return { key: k, data: JSON.parse(localStorage.getItem(k) || '{}') };
            } catch {
              return null;
            }
          })
          .filter(p => p && p.data.isComplete)
          .sort((a, b) => (a.data.timestamp || 0) - (b.data.timestamp || 0));

        // Delete oldest completed projects until we have space or run out
        for (const project of oldProjects) {
          console.warn(`Deleting old project to free space: ${project.data.fileName}`);
          localStorage.removeItem(project.key);

          try {
            attemptSave();
            console.warn('Successfully saved after freeing space');
            await loadProjects();
            return;
          } catch (retryErr) {
            if (!isQuotaExceededError(retryErr)) {
              throw retryErr;
            }
            // Still not enough space, continue deleting
          }
        }

        // Could not free enough space
        throw new Error(
          'Storage full. Unable to save progress. Please delete some old projects and try again.'
        );
      }

      console.error('Failed to save project:', err);
      throw err;
    }
  }, [loadProjects]);

  /**
   * Delete a project from localStorage by ID.
   *
   * @param {string} projectId - The ID of the project to delete
   * @throws {Error} If deletion fails
   */
  const deleteProject = useCallback(async (projectId) => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
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
   * @returns {Object|null} The project data, or null if not found
   */
  const getProject = useCallback((projectId) => {
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Error getting project:', err);
      return null;
    }
  }, []);

  /**
   * Check if a project exists in storage.
   *
   * @param {string} projectId - The ID to check
   * @returns {boolean} True if the project exists
   */
  const projectExists = useCallback((projectId) => {
    return localStorage.getItem(`${STORAGE_PREFIX}${projectId}`) !== null;
  }, []);

  // Load projects when the hook is first used
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    savedProjects,    // Array of saved projects
    loading,          // Loading state
    loadProjects,     // Reload the project list
    saveProject,      // Save or update a project
    deleteProject,    // Delete a project by ID
    getProject,       // Get a single project by ID
    projectExists     // Check if a project exists
  };
}

export default useProjects;
