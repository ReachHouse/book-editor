/**
 * =============================================================================
 * API ROUTES - Core Editing Endpoints
 * =============================================================================
 *
 * These routes handle the main editing functionality:
 * - Sending text chunks to Claude for editing
 * - Generating document-specific style guides
 * - Creating Word documents with Track Changes
 *
 * ENDPOINTS:
 * ----------
 * POST /api/edit-chunk         - Edit a text chunk using Claude AI
 * POST /api/generate-style-guide - Generate style guide for consistency
 * POST /api/generate-docx      - Create Word document with Track Changes
 *
 * WORKFLOW:
 * ---------
 * 1. Frontend splits document into ~2000 word chunks
 * 2. Each chunk sent to /api/edit-chunk
 * 3. After first chunk, /api/generate-style-guide creates consistency guide
 * 4. When complete, /api/generate-docx creates downloadable Word file
 *
 * ERROR HANDLING:
 * ---------------
 * - Input validation returns 400 for missing required fields
 * - API key issues return 500 with configuration error
 * - Service errors are caught and returned as 500 with message
 *
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const { editChunk, generateStyleGuide } = require('../services/anthropicService');
const { generateDocxBuffer } = require('../services/documentService');

// =============================================================================
// EDITING ENDPOINT
// =============================================================================

/**
 * POST /api/edit-chunk
 *
 * Edit a chunk of manuscript text using Claude AI.
 *
 * This is the core editing endpoint called repeatedly by the frontend,
 * once for each ~2000 word chunk of the document.
 *
 * Request body:
 *   {
 *     text: string,           // Required: Text to edit
 *     styleGuide?: string,    // Optional: Style guide from previous chunks
 *     isFirst?: boolean       // Optional: True if first chunk (default false)
 *   }
 *
 * Response:
 *   { editedText: string }    // The edited text
 *
 * Errors:
 *   400 - No text provided
 *   500 - API key not configured or API error
 */
router.post('/api/edit-chunk', async (req, res) => {
  try {
    const { text, styleGuide, isFirst } = req.body;

    // Validate required input
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Check API key configuration
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'API key not configured. Please set ANTHROPIC_API_KEY environment variable.'
      });
    }

    // Send to Claude for editing
    const editedText = await editChunk(text, styleGuide, isFirst);
    res.json({ editedText });

  } catch (error) {
    console.error('Edit chunk error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STYLE GUIDE GENERATION ENDPOINT
// =============================================================================

/**
 * POST /api/generate-style-guide
 *
 * Generate a document-specific style guide from edited text.
 *
 * Called after the first chunk is edited. The resulting style guide
 * is included in subsequent chunk requests to maintain consistency.
 *
 * Request body:
 *   { text: string }          // Required: Edited text to analyze
 *
 * Response:
 *   { styleGuide: string }    // Brief style description
 *
 * Note: This endpoint returns a default guide on error rather than
 * failing, since style guide generation is not critical to editing.
 */
router.post('/api/generate-style-guide', async (req, res) => {
  try {
    const { text } = req.body;

    // Validate required input
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Generate style guide from edited text
    const styleGuide = await generateStyleGuide(text);
    res.json({ styleGuide });

  } catch (error) {
    console.error('Style guide generation error:', error.message);
    // Return default instead of error - style guide is non-critical
    res.json({
      styleGuide: 'Professional, clear, and engaging style following Reach Publishers standards.'
    });
  }
});

// =============================================================================
// DOCUMENT GENERATION ENDPOINT
// =============================================================================

/**
 * POST /api/generate-docx
 *
 * Generate a Word document with native Track Changes.
 *
 * This is the final step in the editing workflow. It takes the original
 * and edited text, computes the diff, and creates a .docx file with
 * proper Track Changes markup.
 *
 * Request body:
 *   {
 *     originalText: string,   // Required: Original manuscript text
 *     editedText: string,     // Required: AI-edited text
 *     fileName?: string       // Optional: Output filename
 *   }
 *
 * Response:
 *   Binary .docx file with Content-Disposition header for download
 *
 * Track Changes format in the output:
 *   - Deletions: Red strikethrough
 *   - Insertions: Blue underline
 *   - Author: "AI Editor"
 */
router.post('/api/generate-docx', async (req, res) => {
  try {
    const { originalText, editedText, fileName } = req.body;

    // Validate required inputs
    if (!originalText || !editedText) {
      return res.status(400).json({ error: 'Missing originalText or editedText' });
    }

    // Log generation start (useful for debugging)
    console.log('Generating document with Native Track Changes...');
    console.log('Original length:', originalText.length, 'characters');
    console.log('Edited length:', editedText.length, 'characters');

    // Generate the .docx buffer
    const buffer = await generateDocxBuffer(originalText, editedText);

    // Set output filename
    const outputFileName = fileName || 'edited_document.docx';

    // Set headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${outputFileName}"`
    );

    // Send the binary buffer
    res.send(buffer);

    console.log('Document generated successfully:', outputFileName);

  } catch (error) {
    console.error('Document generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = router;
