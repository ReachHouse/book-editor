import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Loader, Trash2, Clock, BookOpen, X, Play } from 'lucide-react';
import * as mammoth from 'mammoth';

// ============================================================================
// CONSTANTS
// ============================================================================

// Use relative URLs since frontend and backend are served from same domain
const API_BASE_URL = '';

const CHUNK_SIZES = {
  NEW_DOCUMENTS: 2000,
  LEGACY_DEFAULT: 3000
};

const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 2000
};

const STYLE_GUIDE = `REACH PUBLISHERS HOUSE STYLE GUIDE

All edits follow UK English (Oxford Style Manual by R.M. Ritter)

KEY RULES:
• UK spelling: -ise not -ize (realise, organise), honour not honor, travelled not traveled
• Metric system: metres, centimetres, kilometres
• Special care with apostrophes - never for plurals (CDs not CD's, 1960s not 1960's)
• your vs you're, its vs it's
• Race terms: Black, White, Coloured (capitalized in South African context)
• who for people, that/which for things
• Numbers 1-9 spelled out, 10+ numerical (unless starting sentence)
• Italics for: foreign words, slang, emphasis, book/magazine/newspaper titles, internal thoughts
• Proper nouns capitalized: "Can Dad come?" vs "my dad is here"
• Hyphens: "two years old" vs "two-year-old boy"
• Times: 4am, four o'clock (not 16h00)
• Book/movie titles in italics: The Great Gatsby
• Direct dialogue: double quotes, new speaker = new line
• Comma before dialogue tag: "No," she said.
• Watch for repetition, consistency, concord errors
• Replace difficult/uncommon words with simpler alternatives
• No deletions without author consent
• Highlight all changes so author can review

CRITICAL: All changes must be highlighted/tracked.`;

const FULL_STYLE_GUIDE_DOCUMENT = `REACH PUBLISHERS NEW EDITORS' GUIDELINES TO HOUSE STYLE - Editing Brief

All our edits (if not a proofread) are in-depth edits i.e. it is not just a simple proofread, but rather a thorough in-depth edit looking at all facets including the following:

UK SPELLING NOT US (unless otherwise specified). (also not SA -- pref. UK)

GRAMMAR: Editor to correct the following:

Check general grammar, spelling, punctuation, sentence construction, tenses, prepositions, Number and concord

(1) Consistency in the use of capitals and of the chosen form of English (i.e. US, SA or UK); We work off the Oxford Style Manual (R.M. Ritter) -- UK English

We follow the UK style which means using the metric system e.g. metres and centimetres and s rather than z (realise not realize); honour not honor; travelled not traveled etc.

(2) GENERAL

Watch for misuse of APOSTROPHES (common error) or missing apostrophes.

The rules concerning the use of apostrophes in written English are very simple:

* They are used to denote a missing letter or letters
* They are used to denote possession
* Apostrophes are NEVER ever used to denote plurals!

NOTE: Special care must be taken over the use of your and you're, it's and its.

RACE

Most recently it has become more common practice to capitalize Black, White and Coloured in the South African context.

REPETITION - Look out for too much repetition of words or phrases

CONSISTENCY - Watch for consistency - names spelt same throughout etc.

WHO/THAT/WHICH - who always refers to people

NUMBERS - 1-9 spelt out and 10+ in numerical

ITALICS - Slang or foreign words, emphasis, titles of books/magazines/newspapers, internal thought

PROPER NOUNS vs COMMON NOUNS - Check for capitalization rules

HYPHENS - "two years old" vs "two-year-old boy"

TIMES - 4am, four o'clock preferred over 16h00

FICTION TIPS:
- Internal thoughts in italics
- New speaker, new line
- Consistent quotation marks throughout

CONCORD - Watch for singular/plural agreement

The aim is to change whatever needs changing so the book reads well in good English form. As you make the changes, highlight them to bring the author's attention to them.

Kind regards
Sally Veenman
Reach Publishers, Head of Editing Department`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const detectLanguage = (text) => {
  const sample = text.substring(0, 1000).toLowerCase();
  if (/\b(the|and|is|in|to|of|a)\b/.test(sample)) return 'English';
  if (/\b(el|la|de|y|en|los|las)\b/.test(sample)) return 'Spanish';
  if (/\b(le|la|de|et|en|les|un|une)\b/.test(sample)) return 'French';
  return 'English (assumed)';
};

const createChunks = (paragraphs, maxWordsPerChunk) => {
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;
  
  for (const para of paragraphs) {
    const paraWordCount = para.split(/\s+/).length;
    
    if (currentWordCount + paraWordCount > maxWordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [para];
      currentWordCount = paraWordCount;
    } else {
      currentChunk.push(para);
      currentWordCount += paraWordCount;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }
  
  return chunks;
};

const formatFileName = (fileName) => {
  return fileName.replace(/\.(doc|docx)$/i, '_EDITED.docx');
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function App() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [editedContent, setEditedContent] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  useEffect(() => {
    loadSavedProjects();
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, { timestamp, message, type }]);
  };

  // Storage operations using localStorage
  const loadSavedProjects = async () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('book_'));
      const projects = [];
      
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            projects.push(JSON.parse(data));
          }
        } catch (err) {
          console.error('Error loading project:', err);
        }
      }
      
      setSavedProjects(projects.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.error('Error loading saved projects:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const saveProgress = async (projectData) => {
    try {
      const key = `book_${projectData.id}`;
      localStorage.setItem(key, JSON.stringify(projectData));
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  const deleteSavedProject = async (projectId) => {
    try {
      localStorage.removeItem(`book_${projectId}`);
      
      if (editedContent && editedContent.fileName === projectId) {
        setEditedContent(null);
        setCompleted(false);
      }
      
      await loadSavedProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const analyzeDocument = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0).length;
    const languageDetection = detectLanguage(text);
    const estimatedChunks = Math.ceil(wordCount / CHUNK_SIZES.NEW_DOCUMENTS);
    
    return {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      wordCount: wordCount.toLocaleString(),
      paragraphs: paragraphs.toLocaleString(),
      language: languageDetection,
      estimatedChunks,
      estimatedTime: `${Math.ceil(estimatedChunks * 1.5)} - ${Math.ceil(estimatedChunks * 2)} minutes`
    };
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
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

  const editChunk = async (text, styleGuide, isFirst, logFn, retryCount = 0) => {
    logFn('Sending to server for editing...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/edit-chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, styleGuide, isFirst })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }
      
      const data = await response.json();
      return data.editedText;
      
    } catch (err) {
      logFn(`Error: ${err.message}`, 'error');
      
      if (retryCount < API_CONFIG.MAX_RETRIES) {
        const delay = API_CONFIG.RETRY_DELAY_BASE * (retryCount + 1);
        logFn(`Retrying in ${delay/1000}s... (Attempt ${retryCount + 1}/${API_CONFIG.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return editChunk(text, styleGuide, isFirst, logFn, retryCount + 1);
      }
      
      throw err;
    }
  };

  const generateStyleGuide = async (firstEditedChunk, logFn) => {
    try {
      logFn('Generating style guide from first section...');
      
      const response = await fetch(`${API_BASE_URL}/api/generate-style-guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: firstEditedChunk })
      });
      
      if (!response.ok) {
        return 'Professional, clear, and engaging style following Reach Publishers standards.';
      }
      
      const data = await response.json();
      return data.styleGuide;
    } catch (err) {
      return 'Professional, clear, and engaging style following Reach Publishers standards.';
    }
  };

  const processBook = async (resumeProject = null) => {
    if (resumeProject && (!resumeProject.originalText || !resumeProject.fileName)) {
      setError('Invalid project data. Please upload the document again.');
      return;
    }
    
    if (!file && !resumeProject) return;
    
    setProcessing(true);
    setError(null);
    setDebugLog([]);
    setProgress({ current: 0, total: 0, stage: 'Reading document...' });
    
    const projectId = resumeProject ? resumeProject.id : Date.now().toString();
    
    try {
      let originalText, chunks, editedChunks, styleGuide, startIndex;
      
      if (resumeProject) {
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
        
        if (i === 0 && !styleGuide) {
          styleGuide = await generateStyleGuide(editedChunk, addLog);
        }
        
        await saveProgress({
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
      
      addLog('All sections complete');
      
      const fullEditedText = editedChunks.join('\n\n');
      const docContent = {
        original: originalText,
        edited: fullEditedText,
        fileName: formatFileName(resumeProject ? resumeProject.fileName : file.name)
      };
      
      setProgress({ current: chunks.length, total: chunks.length, stage: 'Finalizing...' });
      
      await saveProgress({
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
      await loadSavedProjects();
      
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
      setError('Processing failed: ' + err.message);
      setProcessing(false);
      await loadSavedProjects();
    }
  };

  const downloadFile = async (content) => {
    if (!content) return;
    
    setDownloadingDocx(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: content.original,
          editedText: content.edited,
          fileName: formatFileName(content.fileName)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server failed to generate document');
      }
      
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formatFileName(content.fileName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setDownloadingDocx(false);
      
    } catch (err) {
      console.error('Download error:', err);
      setDownloadingDocx(false);
      
      if (err.message.includes('Failed to fetch')) {
        setError(`Cannot connect to server. Please try again later.`);
      } else {
        setError('Download failed: ' + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <FileText className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-5xl font-bold mb-3">Professional Book Editor</h1>
          <p className="text-gray-400 text-lg mb-6">AI-powered manuscript editing with tracked changes</p>
          
          <button
            onClick={() => setShowStyleGuide(true)}
            className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all hover:scale-105"
          >
            <BookOpen className="w-5 h-5" />
            View Reach Publishers Style Guide
          </button>
        </div>

        {/* Style Guide Modal */}
        {showStyleGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-6 overflow-auto">
            <div className="bg-gray-800 rounded-xl w-full max-w-2xl my-auto shadow-2xl" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div className="p-4 border-b border-gray-700" style={{ flexShrink: 0 }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-500" />
                    Reach Publishers Style Guide
                  </h2>
                  <button
                    onClick={() => setShowStyleGuide(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 mb-4">
                  <p className="text-xs text-green-400">
                    <strong>Important:</strong> All edits strictly follow the Reach Publishers House Style Guide.
                  </p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <pre className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed" style={{ margin: 0 }}>
{FULL_STYLE_GUIDE_DOCUMENT}
                  </pre>
                </div>
              </div>
              <div className="p-4 border-t border-gray-700" style={{ flexShrink: 0 }}>
                <button
                  onClick={() => setShowStyleGuide(false)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingStorage && (
          <div className="bg-gray-800 rounded-xl p-16 text-center shadow-xl">
            <Loader className="w-12 h-12 mx-auto mb-4 text-green-500 animate-spin" />
            <p className="text-gray-400">Loading saved projects...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-xl p-5 mb-8 shadow-lg">
            <div className="flex items-start mb-4">
              <AlertCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-lg text-red-400">Error</p>
                <p className="text-sm text-gray-300 mt-1">{error}</p>
              </div>
            </div>
            
            {debugLog.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto mt-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">Debug Log:</h3>
                {debugLog.map((log, index) => (
                  <div key={index} className={`text-xs mb-1 font-mono ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Section */}
        {!file && !loadingStorage && (
          <>
            <div className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 p-16 text-center hover:border-green-500 transition-all mb-8 shadow-xl">
              <input
                type="file"
                accept=".doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-20 h-20 mx-auto mb-6 text-green-500" />
                <p className="text-2xl font-semibold mb-3">Upload Your Manuscript</p>
                <p className="text-gray-400 mb-2">Microsoft Word documents only (.doc, .docx)</p>
                <p className="text-gray-500 text-sm">
                  Edits follow Reach Publishers House Style Guide (UK English)
                </p>
              </label>
            </div>

            {/* Saved Projects */}
            {savedProjects.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-8 shadow-xl">
                <h2 className="text-3xl font-bold mb-6 flex items-center">
                  <Clock className="w-8 h-8 text-green-500 mr-3" />
                  Previously Edited Books
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Edited books are auto-saved. Download completed books or resume incomplete ones.
                </p>
                <div className="space-y-4">
                  {savedProjects.map((project) => (
                    <div key={project.id} className="bg-gray-700 rounded-lg p-5 flex items-center justify-between hover:bg-gray-600 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-lg truncate">{project.fileName}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {project.isComplete 
                            ? `✓ Completed ${new Date(project.timestamp).toLocaleString()}`
                            : `⏳ In progress: ${project.chunksCompleted}/${project.totalChunks} sections (${Math.round(project.chunksCompleted/project.totalChunks*100)}%)`
                          }
                        </p>
                      </div>
                      <div className="flex gap-3 ml-4">
                        {project.isComplete && (
                          <button
                            onClick={() => {
                              const content = project.docContent || {
                                original: project.originalText,
                                edited: project.fullEditedText,
                                fileName: formatFileName(project.fileName)
                              };
                              downloadFile(content);
                            }}
                            disabled={downloadingDocx}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold p-3 rounded-lg transition-all hover:scale-105 shadow-lg"
                            title="Download Word document with Track Changes"
                          >
                            {downloadingDocx ? (
                              <Loader className="w-5 h-5 animate-spin" />
                            ) : (
                              <Download className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        
                        {!project.isComplete && (
                          <button
                            onClick={() => {
                              setFile({ name: project.fileName });
                              processBook(project);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg transition-all hover:scale-105 shadow-lg"
                            title="Resume editing from where you left off"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteSavedProject(project.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold p-3 rounded-lg transition-all hover:scale-105 shadow-lg"
                          title="Delete from storage"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Analysis Results */}
        {analysis && !processing && !completed && (
          <div className="bg-gray-800 rounded-xl p-8 mb-8 shadow-xl">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              Document Analysis
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">File Name</p>
                <p className="font-semibold text-lg">{analysis.fileName}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">File Size</p>
                <p className="font-semibold text-lg">{analysis.fileSize}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Word Count</p>
                <p className="font-semibold text-lg">{analysis.wordCount}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Paragraphs</p>
                <p className="font-semibold text-lg">{analysis.paragraphs}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Language</p>
                <p className="font-semibold text-lg">{analysis.language}</p>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Estimated Time</p>
                <p className="font-semibold text-lg">{analysis.estimatedTime}</p>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500 rounded-lg p-5 mb-6">
              <p className="text-sm text-green-400 leading-relaxed">
                ✓ Document will be processed in <strong>{analysis.estimatedChunks} sections</strong><br/>
                ✓ Follows <strong>Reach Publishers House Style Guide</strong> (UK English)<br/>
                ✓ Auto-retry on failures (up to 3 attempts per section)
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => processBook()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg transition-all hover:scale-105 shadow-lg text-lg"
              >
                Start Editing
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setAnalysis(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Processing Display */}
        {processing && (
          <div className="bg-gray-800 rounded-xl p-8 mb-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Processing Manuscript</h2>
              <Loader className="w-8 h-8 text-green-500 animate-spin" />
            </div>
            
            <p className="text-gray-400 mb-2">{progress.stage}</p>
            <p className="text-sm text-green-400 mb-4">
              ✓ Progress saved after each section. Resume anytime if interrupted.
            </p>
            
            <div className="bg-gray-700 rounded-full h-6 mb-3 overflow-hidden shadow-inner relative">
              <div
                className="bg-gradient-to-r from-green-600 to-green-500 h-full transition-all duration-500 absolute top-0 left-0"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  {progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 text-center mb-8">
              {progress.current} of {progress.total} sections completed
            </p>

            <div className="bg-gray-900 rounded-lg p-5 max-h-80 overflow-y-auto">
              <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Debug Log
              </h3>
              {debugLog.map((log, index) => (
                <div key={index} className={`text-xs mb-2 font-mono ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Display */}
        {completed && (
          <div className="bg-gray-800 rounded-xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-4xl font-bold mb-3">Editing Complete!</h2>
              <p className="text-gray-400 text-lg">
                Manuscript professionally edited following Reach Publishers House Style Guide.
              </p>
            </div>

            <div className="bg-green-900/20 border border-green-500 rounded-lg p-5 mb-6">
              <p className="text-sm text-green-400 leading-relaxed">
                <strong>✓ Auto-Saved:</strong> Accessible anytime from "Previously Edited Books"
              </p>
            </div>

            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-5 mb-8">
              <p className="text-sm text-blue-400">
                <strong>✓ Track Changes:</strong> Downloads as Word (.docx) with full change tracking<br/>
                • <span className="text-red-400">Red strikethrough</span> for deletions<br/>
                • <span className="text-blue-400">Blue underline</span> for insertions<br/>
                Open in Microsoft Word to review/accept/reject changes.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => downloadFile(editedContent)}
                disabled={downloadingDocx}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all hover:scale-105 shadow-lg flex items-center justify-center text-lg"
              >
                {downloadingDocx ? (
                  <>
                    <Loader className="w-6 h-6 mr-3 animate-spin" />
                    Generating Word Document...
                  </>
                ) : (
                  <>
                    <Download className="w-6 h-6 mr-3" />
                    Download Word Document
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setAnalysis(null);
                  setCompleted(false);
                  setEditedContent(null);
                  setDebugLog([]);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all"
              >
                Edit Another Book
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Reach Publishers. Professional AI-Powered Editing.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
