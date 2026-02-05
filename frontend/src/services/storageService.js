/**
 * =============================================================================
 * STORAGE SERVICE
 * =============================================================================
 *
 * Provides persistent storage for book editing projects using IndexedDB
 * with localStorage fallback for browsers that don't support IndexedDB.
 *
 * IndexedDB provides:
 * - 100MB storage (vs 5-10MB for localStorage)
 * - Better performance for large objects
 * - Async operations that don't block the main thread
 *
 * USAGE:
 * ------
 * import { storageService } from './services/storageService';
 *
 * // Initialize (call once on app start)
 * await storageService.init();
 *
 * // CRUD operations
 * await storageService.saveProject(projectData);
 * const project = await storageService.getProject(projectId);
 * const allProjects = await storageService.getAllProjects();
 * await storageService.deleteProject(projectId);
 *
 * // Storage info
 * const info = await storageService.getStorageInfo();
 *
 * =============================================================================
 */

const DB_NAME = 'BookEditorDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const LOCALSTORAGE_PREFIX = 'book_';

// Storage limits
const INDEXEDDB_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB
const LOCALSTORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB
const WARNING_THRESHOLD = 0.8; // 80%

/**
 * Storage service singleton
 */
class StorageService {
  constructor() {
    this.db = null;
    this.useIndexedDB = false;
    this.initialized = false;
  }

  /**
   * Initialize the storage service.
   * Attempts to use IndexedDB, falls back to localStorage if unavailable.
   *
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    try {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, using localStorage fallback');
        this.useIndexedDB = false;
        this.initialized = true;
        return;
      }

      // Open/create IndexedDB database
      this.db = await this._openDatabase();
      this.useIndexedDB = true;

      // Migrate any existing localStorage data to IndexedDB
      await this._migrateFromLocalStorage();

      console.log('StorageService initialized with IndexedDB');
    } catch (error) {
      console.warn('IndexedDB initialization failed, using localStorage fallback:', error);
      this.useIndexedDB = false;
    }

    this.initialized = true;
  }

  /**
   * Open or create the IndexedDB database.
   *
   * @returns {Promise<IDBDatabase>}
   * @private
   */
  _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for projects
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // Create indexes for common queries
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('isComplete', 'isComplete', { unique: false });
        }
      };
    });
  }

  /**
   * Migrate existing localStorage projects to IndexedDB.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _migrateFromLocalStorage() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCALSTORAGE_PREFIX));

    if (keys.length === 0) return;

    console.log(`Migrating ${keys.length} projects from localStorage to IndexedDB...`);

    for (const key of keys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const project = JSON.parse(data);
          await this._saveToIndexedDB(project);
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`Failed to migrate project ${key}:`, error);
      }
    }

    console.log('Migration complete');
  }

  /**
   * Save a project to IndexedDB.
   *
   * @param {Object} project - Project data
   * @returns {Promise<void>}
   * @private
   */
  _saveToIndexedDB(project) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a project from IndexedDB by ID.
   *
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>}
   * @private
   */
  _getFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all projects from IndexedDB.
   *
   * @returns {Promise<Array>}
   * @private
   */
  _getAllFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a project from IndexedDB.
   *
   * @param {string} id - Project ID
   * @returns {Promise<void>}
   * @private
   */
  _deleteFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Estimate IndexedDB storage usage.
   *
   * @returns {Promise<number>} Bytes used
   * @private
   */
  async _getIndexedDBUsage() {
    // Always measure actual project data for accurate, immediate results.
    // navigator.storage.estimate() reports total origin usage (not just our DB)
    // and doesn't update immediately after deletions.
    const projects = await this._getAllFromIndexedDB();
    let total = 0;
    for (const project of projects) {
      total += JSON.stringify(project).length * 2; // UTF-16
    }
    return total;
  }

  /**
   * Get localStorage usage in bytes.
   *
   * @returns {number}
   * @private
   */
  _getLocalStorageUsage() {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(LOCALSTORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          total += (key.length + value.length) * 2;
        }
      }
    }
    return total;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Save a project.
   *
   * @param {Object} project - Project data with 'id' field
   * @returns {Promise<void>}
   */
  async saveProject(project) {
    if (!this.initialized) await this.init();

    if (this.useIndexedDB) {
      await this._saveToIndexedDB(project);
    } else {
      const key = `${LOCALSTORAGE_PREFIX}${project.id}`;
      const jsonData = JSON.stringify(project);

      try {
        localStorage.setItem(key, jsonData);
      } catch (error) {
        if (this._isQuotaError(error)) {
          throw new Error('Storage full. Please delete some old projects and try again.');
        }
        throw error;
      }
    }
  }

  /**
   * Get a project by ID.
   *
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>}
   */
  async getProject(id) {
    if (!this.initialized) await this.init();

    if (this.useIndexedDB) {
      return this._getFromIndexedDB(id);
    } else {
      const key = `${LOCALSTORAGE_PREFIX}${id}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
  }

  /**
   * Get all projects sorted by timestamp (newest first).
   *
   * @returns {Promise<Array>}
   */
  async getAllProjects() {
    if (!this.initialized) await this.init();

    let projects;

    if (this.useIndexedDB) {
      projects = await this._getAllFromIndexedDB();
    } else {
      projects = [];
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCALSTORAGE_PREFIX));

      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            projects.push(JSON.parse(data));
          }
        } catch (error) {
          console.error('Error loading project:', key, error);
        }
      }
    }

    // Sort by timestamp, newest first
    return projects.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  /**
   * Delete a project by ID.
   *
   * @param {string} id - Project ID
   * @returns {Promise<void>}
   */
  async deleteProject(id) {
    if (!this.initialized) await this.init();

    if (this.useIndexedDB) {
      await this._deleteFromIndexedDB(id);
    } else {
      localStorage.removeItem(`${LOCALSTORAGE_PREFIX}${id}`);
    }
  }

  /**
   * Check if a project exists.
   *
   * @param {string} id - Project ID
   * @returns {Promise<boolean>}
   */
  async projectExists(id) {
    const project = await this.getProject(id);
    return project !== null;
  }

  /**
   * Get storage usage information.
   *
   * @returns {Promise<Object>} { usedBytes, limitBytes, usedMB, limitMB, percentUsed, isWarning, storageType }
   */
  async getStorageInfo() {
    if (!this.initialized) await this.init();

    let usedBytes, limitBytes;

    if (this.useIndexedDB) {
      usedBytes = await this._getIndexedDBUsage();
      limitBytes = INDEXEDDB_LIMIT_BYTES;
    } else {
      usedBytes = this._getLocalStorageUsage();
      limitBytes = LOCALSTORAGE_LIMIT_BYTES;
    }

    const percentUsed = usedBytes / limitBytes;

    return {
      usedBytes,
      limitBytes,
      usedMB: (usedBytes / 1024 / 1024).toFixed(2),
      limitMB: (limitBytes / 1024 / 1024).toFixed(0),
      percentUsed: Math.round(percentUsed * 100),
      isWarning: percentUsed >= WARNING_THRESHOLD,
      storageType: this.useIndexedDB ? 'IndexedDB' : 'localStorage'
    };
  }

  /**
   * Check if an error is a quota exceeded error.
   *
   * @param {Error} error
   * @returns {boolean}
   * @private
   */
  _isQuotaError(error) {
    return (
      error instanceof DOMException && (
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.name === 'QuotaExceededError' ||
        error.code === 22
      )
    );
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;
