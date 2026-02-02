/**
 * Reach Publishers Book Editor - Main Application
 *
 * AI-powered manuscript editing with native Word Track Changes support.
 * Refactored for maintainability with modular components and services.
 */

import React, { useState, useCallback } from 'react';
import { Loader } from 'lucide-react';
import * as mammoth from 'mammoth';

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

  // ============================================================================
  // LOGGING
  // ============================================================================

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, { timestamp, message, type }]);
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
    // Validation
    if (resumeProject && (!resumeProject.originalText || !resumeProject.fileName)) {
      setError('Invalid project data. Please upload the document again.');
      return;
    }

    if (!file && !resumeProject) return;

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
      await loadProjects();

    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
      setError('Processing failed: ' + err.message);
      setProcessing(false);
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
    if (editedContent && editedContent.fileName === projectId) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-5xl">

        {/* Header */}
        <Header onShowStyleGuide={() => setShowStyleGuide(true)} />

        {/* Style Guide Modal */}
        <StyleGuideModal
          isOpen={showStyleGuide}
          onClose={() => setShowStyleGuide(false)}
        />

        {/* Loading State */}
        {loadingStorage && (
          <div className="bg-gray-800 rounded-xl p-16 text-center shadow-xl">
            <Loader className="w-12 h-12 mx-auto mb-4 text-green-500 animate-spin" />
            <p className="text-gray-400">Loading saved projects...</p>
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
        <div className="text-center mt-12 text-gray-500">
          <p className="text-xs text-gray-600 mb-1">{VERSION_DISPLAY}</p>
          <p className="text-sm">&copy; {new Date().getFullYear()} Reach Publishers. Professional AI-Powered Editing.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
