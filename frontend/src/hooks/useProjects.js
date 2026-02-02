/**
 * useProjects Hook
 * Manages saved projects in localStorage
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'book_';

/**
 * Custom hook for managing book editing projects
 * Handles saving, loading, and deleting projects from localStorage
 */
export function useProjects() {
  const [savedProjects, setSavedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load all saved projects from localStorage
   */
  const loadProjects = useCallback(async () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      const projects = [];

      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            projects.push(JSON.parse(data));
          }
        } catch (err) {
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
   * Save or update a project
   */
  const saveProject = useCallback(async (projectData) => {
    try {
      const key = `${STORAGE_PREFIX}${projectData.id}`;
      localStorage.setItem(key, JSON.stringify(projectData));
      // Reload to update list
      await loadProjects();
    } catch (err) {
      console.error('Failed to save project:', err);
      throw err;
    }
  }, [loadProjects]);

  /**
   * Delete a project by ID
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
   * Get a specific project by ID
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
   * Check if a project exists
   */
  const projectExists = useCallback((projectId) => {
    return localStorage.getItem(`${STORAGE_PREFIX}${projectId}`) !== null;
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    savedProjects,
    loading,
    loadProjects,
    saveProject,
    deleteProject,
    getProject,
    projectExists
  };
}

export default useProjects;
