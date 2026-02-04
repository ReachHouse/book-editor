/**
 * Reach Publishers Book Editor - Main Application
 *
 * AI-powered manuscript editing with native Word Track Changes support.
 * Refactored for maintainability with modular components and services.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Loader } from 'lucide-react';
import * as mammoth from 'mammoth';

// Maximum log entries to prevent memory leak
const MAX_LOG_ENTRIES = 500;

// Components
import {
  Header,
  StyleGuideModal,
  FileUpload,
  DocumentAnalysis,
  ProcessingView,
  CompletionView,
  SavedProjects,
  ErrorDisplay
} from './components';

// Hooks
import { useProjects } from './hooks/useProjects';

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
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  // Projects hook
  const {
    savedProjects,
    loading: loadingStorage,
    loadProjects,
    saveProject,
    deleteProject
  } = useProjects();

  // Ref to prevent duplicate processBook calls (race condition fix)
  const processingRef = useRef(false);

  // ============================================================================
  // LOGGING
  // ============================================================================

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => {
      const newLog = [...prev, { timestamp, message, type }];
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

    // Initialize processing state
    setProcessing(true);
    setError(null);
    setDebugLog([]);
    setProgress({ current: 0, total: 0, stage: 'Reading document...' });

    const projectId = resumeProject ? resumeProject.id : Date.now().toString();

    try {
      let originalText, chunks, editedChunks, styleGuide, startIndex;

      if (resumeProject) {
        // Resume existing project
        addLog(`Resuming: ${resumeProject.fileName}`);

        if (!resumeProject.editedChunks || !Array.isArray(resumeProject.editedChunks)) {
          throw new Error('Cannot resume: Invalid project data');
        }

        originalText = resumeProject.originalText;
        const chunkSize = resumeProject.chunkSize || CHUNK_SIZES.LEGACY_DEFAULT;
        addLog(`Using chunk size: ${chunkSize} words`);

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
        addLog('Starting new document...');

        if (!file || typeof file.arrayBuffer !== 'function') {
          throw new Error('Invalid file. Please upload again.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        originalText = result.value;

        if (!originalText || !originalText.trim()) {
          throw new Error('Document is empty.');
        }

        addLog(`Extracted ${originalText.length} characters`);

        const paragraphs = originalText.split(/\n+/).filter(p => p.trim());
        chunks = createChunks(paragraphs, CHUNK_SIZES.NEW_DOCUMENTS);

        if (!chunks.length) {
          throw new Error('Could not process document.');
        }

        editedChunks = [];
        styleGuide = '';
        startIndex = 0;

        addLog(`Created ${chunks.length} sections`);
        setProgress({ current: 0, total: chunks.length, stage: 'Editing...' });
      }

      // Process each chunk
      for (let i = startIndex; i < chunks.length; i++) {
        addLog(`Processing section ${i + 1}/${chunks.length}`);
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

        addLog(`Section ${i + 1} complete (${editedChunk.length} chars)`);
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
          chunkSize: CHUNK_SIZES.NEW_DOCUMENTS,
          editedChunks,
          originalText,
          styleGuide,
          isComplete: false
        });
      }

      // Finalize
      addLog('All sections complete');

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
        chunkSize: CHUNK_SIZES.NEW_DOCUMENTS,
        originalText,
        fullEditedText,
        styleGuide,
        isComplete: true,
        docContent
      });

      setEditedContent(docContent);
      addLog('Complete! File saved.');
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

  const handleResume = (project) => {
    setFile({ name: project.fileName });
    processBook(project);
  };

  const handleDeleteProject = async (projectId) => {
    await deleteProject(projectId);

    // Clear current content if we deleted the active project
    if (editedContent && editedContent.projectId === projectId) {
      setEditedContent(null);
      setCompleted(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setCompleted(false);
    setEditedContent(null);
    setDebugLog([]);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-surface-950 text-surface-200 relative overflow-hidden">
      {/* Ambient background layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/50 to-surface-950" />
        {/* Top ambient glow - green tinted */}
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-[0.035]" style={{ background: 'radial-gradient(ellipse, #4ade80, transparent 70%)' }} />
        {/* Bottom ambient warmth */}
        <div className="absolute -bottom-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(ellipse, #60a5fa, transparent 70%)' }} />
        {/* Subtle noise texture via CSS */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }} />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 py-10 sm:py-14 max-w-4xl">

        {/* Header */}
        <Header onShowStyleGuide={() => setShowStyleGuide(true)} />

        {/* Style Guide Modal */}
        <StyleGuideModal
          isOpen={showStyleGuide}
          onClose={() => setShowStyleGuide(false)}
        />

        {/* Loading State */}
        {loadingStorage && (
          <div className="glass-card py-10 text-center animate-fade-in">
            <Loader className="w-8 h-8 mx-auto mb-3 text-brand-400 animate-spin" />
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
              onDownload={handleDownload}
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

export default App;
