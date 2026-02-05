/**
 * Reach Publishers Book Editor - Main Application
 *
 * AI-powered manuscript editing with native Word Track Changes support.
 * Refactored for maintainability with modular components and services.
 *
 * AUTH FLOW:
 * ----------
 * - AppWrapper renders AuthProvider around App
 * - App checks isAuthenticated from useAuth()
 * - If not authenticated: shows LoginPage or RegisterPage
 * - If authenticated: shows the editor as before
 */

import React, { useState, useCallback, useRef } from 'react';
import { Loader } from 'lucide-react';
import * as mammoth from 'mammoth';

// Maximum log entries to prevent memory leak
const MAX_LOG_ENTRIES = 500;

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import {
  Header,
  StyleGuideModal,
  FileUpload,
  DocumentAnalysis,
  ProcessingView,
  CompletionView,
  SavedProjects,
  ErrorDisplay,
  LoginPage,
  RegisterPage,
  UsageDisplay,
  AdminDashboard,
  ToastContainer
} from './components';

// Hooks
import { useProjects } from './hooks/useProjects';
import { useToast } from './hooks/useToast';

// Services
import { editChunk, generateStyleGuide, downloadDocument } from './services/api';

// Utils & Constants
import {
  detectLanguage,
  createChunks,
  formatFileName,
  countWords,
  countParagraphs,
  formatFileSize,
  estimateProcessingTime
} from './utils/documentUtils';
import { CHUNK_SIZES, VERSION_DISPLAY } from './constants';

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

function App() {
  // Auth state
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [authPage, setAuthPage] = useState('login'); // 'login' or 'register'

  // File and analysis state
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [completed, setCompleted] = useState(false);
  const [editedContent, setEditedContent] = useState(null);

  // UI state
  const [error, setError] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  // Projects hook (server-backed storage)
  const {
    savedProjects,
    loading: loadingStorage,
    loadProjects,
    saveProject,
    deleteProject,
    getProject
  } = useProjects();

  // Toast notifications
  const { toasts, addToast, dismissToast } = useToast();

  // Ref to prevent duplicate processBook calls (race condition fix)
  const processingRef = useRef(false);

  // ============================================================================
  // LOGGING
  // ============================================================================

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setDebugLog(prev => {
      const newLog = [...prev, { id, timestamp, message, type }];
      // Limit log entries to prevent memory leak
      if (newLog.length > MAX_LOG_ENTRIES) {
        return newLog.slice(-MAX_LOG_ENTRIES);
      }
      return newLog;
    });
  }, []);

  // ============================================================================
  // DOCUMENT ANALYSIS
  // ============================================================================

  const analyzeDocument = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    const wordCount = countWords(text);
    const paragraphs = countParagraphs(text);
    const languageDetection = detectLanguage(text);
    const estimatedChunks = Math.ceil(wordCount / CHUNK_SIZES.NEW_DOCUMENTS);

    return {
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      wordCount: wordCount.toLocaleString(),
      paragraphs: paragraphs.toLocaleString(),
      language: languageDetection,
      estimatedChunks,
      estimatedTime: estimateProcessingTime(estimatedChunks)
    };
  };

  // ============================================================================
  // FILE UPLOAD HANDLER
  // ============================================================================

  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile.name.match(/\.(doc|docx)$/i)) {
      setError('Please upload a Microsoft Word document (.doc or .docx)');
      return;
    }

    setError(null);
    setFile(uploadedFile);
    setAnalysis(null);
    setCompleted(false);
    setEditedContent(null);
    setDebugLog([]);

    try {
      const analysisResult = await analyzeDocument(uploadedFile);
      setAnalysis(analysisResult);
    } catch (err) {
      setError('Failed to analyze document: ' + err.message);
      setFile(null);
    }
  };

  // ============================================================================
  // MAIN PROCESSING LOGIC
  // ============================================================================

  const processBook = async (resumeProject = null) => {
    // Race condition guard: prevent duplicate calls
    if (processingRef.current) {
      return;
    }

    // Validation
    if (resumeProject && (!resumeProject.originalText || !resumeProject.fileName)) {
      setError('Invalid project data. Please upload the document again.');
      return;
    }

    if (!file && !resumeProject) return;

    // Set processing lock
    processingRef.current = true;

    // For resume: set a placeholder file so the upload section stays hidden
    if (resumeProject) {
      setFile({ name: resumeProject.fileName });
    }

    // Initialize processing state
    setProcessing(true);
    setError(null);
    setDebugLog([]);
    setProgress({ current: 0, total: 0, stage: 'Reading document...' });

    const projectId = resumeProject ? resumeProject.id : Date.now().toString();

    try {
      let originalText, chunks, editedChunks, styleGuide, startIndex, chunkSize;

      if (resumeProject) {
        // Resume existing project
        addLog(`Resuming editing: ${resumeProject.fileName}`);

        if (!resumeProject.editedChunks || !Array.isArray(resumeProject.editedChunks)) {
          throw new Error('Cannot resume: Invalid project data');
        }

        originalText = resumeProject.originalText;
        chunkSize = resumeProject.chunkSize || CHUNK_SIZES.LEGACY_DEFAULT;
        addLog(`Resuming with original settings`);

        const paragraphs = originalText.split(/\n+/).filter(p => p.trim());
        chunks = createChunks(paragraphs, chunkSize);

        if (chunks.length !== resumeProject.totalChunks) {
          throw new Error('Cannot resume: Document structure changed. Please start new edit.');
        }

        editedChunks = [...resumeProject.editedChunks];
        styleGuide = resumeProject.styleGuide || '';
        startIndex = resumeProject.chunksCompleted || 0;

        if (startIndex >= chunks.length) {
          throw new Error('Project already complete. Use download button.');
        }

        setProgress({ current: startIndex, total: chunks.length, stage: 'Resuming...' });

      } else {
        // New document
        addLog('Preparing document for editing...');

        if (!file || typeof file.arrayBuffer !== 'function') {
          throw new Error('Invalid file. Please upload again.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        originalText = result.value;

        if (!originalText || !originalText.trim()) {
          throw new Error('Document is empty.');
        }

        addLog('Document loaded successfully');

        chunkSize = CHUNK_SIZES.NEW_DOCUMENTS;
        const paragraphs = originalText.split(/\n+/).filter(p => p.trim());
        chunks = createChunks(paragraphs, chunkSize);

        if (!chunks.length) {
          throw new Error('Could not process document.');
        }

        editedChunks = [];
        styleGuide = '';
        startIndex = 0;

        addLog(`Document split into ${chunks.length} sections`);
        setProgress({ current: 0, total: chunks.length, stage: 'Editing...' });
      }

      // Process each chunk
      for (let i = startIndex; i < chunks.length; i++) {
        addLog(`Editing section ${i + 1} of ${chunks.length}...`);
        setProgress({
          current: i,
          total: chunks.length,
          stage: `Editing section ${i + 1}/${chunks.length}...`
        });

        const editedChunk = await editChunk(
          chunks[i],
          styleGuide,
          i === 0 && !resumeProject,
          addLog
        );

        if (!editedChunk || !editedChunk.trim()) {
          throw new Error(`Section ${i + 1} returned empty.`);
        }

        addLog(`Section ${i + 1} complete`);
        editedChunks.push(editedChunk);

        // Generate style guide after first chunk
        if (i === 0 && !styleGuide) {
          styleGuide = await generateStyleGuide(editedChunk, addLog);
        }

        // Save progress after each chunk
        await saveProject({
          id: projectId,
          fileName: resumeProject ? resumeProject.fileName : file.name,
          timestamp: Date.now(),
          chunksCompleted: i + 1,
          totalChunks: chunks.length,
          chunkSize,
          editedChunks,
          originalText,
          styleGuide,
          isComplete: false
        });
      }

      // Finalize
      addLog('All sections edited successfully');

      const fullEditedText = editedChunks.join('\n\n');
      const docContent = {
        projectId,
        original: originalText,
        edited: fullEditedText,
        fileName: formatFileName(resumeProject ? resumeProject.fileName : file.name)
      };

      setProgress({ current: chunks.length, total: chunks.length, stage: 'Finalizing...' });

      // Save completed project
      await saveProject({
        id: projectId,
        fileName: resumeProject ? resumeProject.fileName : file.name,
        timestamp: Date.now(),
        chunksCompleted: chunks.length,
        totalChunks: chunks.length,
        chunkSize,
        originalText,
        fullEditedText,
        styleGuide,
        isComplete: true,
        docContent
      });

      setEditedContent(docContent);
      addLog('Editing complete — ready for download');
      setCompleted(true);
      setProcessing(false);
      processingRef.current = false; // Release processing lock
      await loadProjects();

    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
      setError('Processing failed: ' + err.message);
      setFile(null);
      setAnalysis(null);
      setProcessing(false);
      processingRef.current = false; // Release processing lock
      await loadProjects();
    }
  };

  // ============================================================================
  // DOWNLOAD HANDLER
  // ============================================================================

  const handleDownload = async (content) => {
    if (!content) return;

    setDownloadingDocx(true);

    try {
      await downloadDocument(content);
      addToast('Document downloaded successfully', 'success');
    } catch (err) {
      console.error('Download error:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please try again later.');
      } else {
        setError('Download failed: ' + err.message);
      }
    } finally {
      setDownloadingDocx(false);
    }
  };

  /**
   * Handle download from saved projects list.
   * Fetches full project data from server, then triggers download.
   */
  const handleProjectDownload = async (project) => {
    setDownloadingDocx(true);
    try {
      const fullProject = await getProject(project.id);
      if (!fullProject) {
        setError('Project not found. It may have been deleted.');
        return;
      }
      const content = fullProject.docContent || {
        original: fullProject.originalText,
        edited: fullProject.fullEditedText,
        fileName: formatFileName(fullProject.fileName)
      };
      await downloadDocument(content);
      addToast('Document downloaded successfully', 'success');
    } catch (err) {
      console.error('Download error:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please try again later.');
      } else {
        setError('Download failed: ' + err.message);
      }
    } finally {
      setDownloadingDocx(false);
    }
  };

  // ============================================================================
  // PROJECT MANAGEMENT HANDLERS
  // ============================================================================

  const handleResume = async (project) => {
    try {
      const fullProject = await getProject(project.id);
      if (!fullProject) {
        setError('Project not found. It may have been deleted.');
        return;
      }
      processBook(fullProject);
    } catch (err) {
      setError('Failed to load project: ' + err.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    await deleteProject(projectId);
    addToast('Project deleted', 'success');

    // Clear current content if we deleted the active project
    if (editedContent && editedContent.projectId === projectId) {
      setEditedContent(null);
      setCompleted(false);
    }
  };

  const handleReset = useCallback(() => {
    setFile(null);
    setAnalysis(null);
    setCompleted(false);
    setEditedContent(null);
    setError(null);
    setDebugLog([]);
  }, []);

  // Stable callbacks for components that only use state setters (safe with empty deps)
  const handleShowStyleGuide = useCallback(() => setShowStyleGuide(true), []);
  const handleCloseStyleGuide = useCallback(() => setShowStyleGuide(false), []);
  const handleShowAdmin = useCallback(() => setShowAdmin(true), []);
  const handleCloseAdmin = useCallback(() => setShowAdmin(false), []);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 mx-auto mb-3 text-brand-400 animate-spin" />
          <p className="text-surface-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login or register page
  if (!isAuthenticated) {
    if (authPage === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthPage('register')} />;
  }

  // Authenticated — show the editor
  return (
    <div className="min-h-screen bg-surface-950 text-surface-200 relative overflow-hidden">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Ambient background layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/50 to-surface-950" />
        {/* Top ambient glow - green tinted */}
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-[0.035] ambient-glow-green" />
        {/* Bottom ambient warmth */}
        <div className="absolute -bottom-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full opacity-[0.02] ambient-glow-blue" />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015] noise-texture" />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-4xl">

        {/* Header */}
        <Header onShowStyleGuide={handleShowStyleGuide} onShowAdmin={handleShowAdmin} user={user} />

        {/* Usage Display */}
        <UsageDisplay />

        {/* Style Guide Modal */}
        <StyleGuideModal
          isOpen={showStyleGuide}
          onClose={handleCloseStyleGuide}
        />

        {/* Admin Dashboard (full-page view for admins) */}
        {showAdmin && user?.role === 'admin' ? (
          <AdminDashboard onClose={handleCloseAdmin} />
        ) : (
          <>
            {/* Loading State */}
            {loadingStorage && (
              <div className="glass-card py-10 text-center animate-fade-in" role="status" aria-label="Loading saved projects">
                <Loader className="w-8 h-8 mx-auto mb-3 text-brand-400 animate-spin" aria-hidden="true" />
                <p className="text-surface-400 text-sm">Loading saved projects...</p>
              </div>
            )}

            {/* Error Display */}
            <ErrorDisplay error={error} debugLog={debugLog} />

            {/* Upload Section */}
            {!file && !loadingStorage && (
              <>
                <FileUpload onFileSelect={handleFileUpload} />
                <SavedProjects
                  projects={savedProjects}
                  onDownload={handleProjectDownload}
                  onResume={handleResume}
                  onDelete={handleDeleteProject}
                  isDownloading={downloadingDocx}
                />
              </>
            )}

            {/* Analysis Results */}
            {analysis && !processing && !completed && (
              <DocumentAnalysis
                analysis={analysis}
                onStartEditing={() => processBook()}
                onCancel={handleReset}
              />
            )}

            {/* Processing Display */}
            {processing && (
              <ProcessingView progress={progress} debugLog={debugLog} />
            )}

            {/* Completion Display */}
            {completed && (
              <CompletionView
                onDownload={() => handleDownload(editedContent)}
                onEditAnother={handleReset}
                isDownloading={downloadingDocx}
              />
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-10 pb-2">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-surface-700/30" />
            <div className="w-1 h-1 rounded-full bg-surface-700/50" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-surface-700/30" />
          </div>
          <p className="text-xs text-surface-500 mb-0.5">{VERSION_DISPLAY}</p>
          <p className="text-xs text-surface-600">&copy; {new Date().getFullYear()} Reach Publishers</p>
        </div>
      </div>
    </div>
  );
}

/**
 * AppWrapper wraps the main App in AuthProvider so useAuth() works everywhere.
 */
function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWrapper;
