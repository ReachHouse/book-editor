/**
 * API Routes
 * Main editing and document generation endpoints
 */

const express = require('express');
const router = express.Router();
const { editChunk, generateStyleGuide } = require('../services/anthropicService');
const { generateDocxBuffer } = require('../services/documentService');

// ============================================================================
// EDITING ENDPOINT
// ============================================================================

/**
 * POST /api/edit-chunk
 * Edit a chunk of text using Claude AI
 *
 * Body: { text: string, styleGuide?: string, isFirst?: boolean }
 * Response: { editedText: string }
 */
router.post('/api/edit-chunk', async (req, res) => {
  try {
    const { text, styleGuide, isFirst } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'API key not configured. Please set ANTHROPIC_API_KEY environment variable.'
      });
    }

    const editedText = await editChunk(text, styleGuide, isFirst);
    res.json({ editedText });

  } catch (error) {
    console.error('Edit chunk error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// STYLE GUIDE GENERATION ENDPOINT
// ============================================================================

/**
 * POST /api/generate-style-guide
 * Generate a style guide from edited text for consistency
 *
 * Body: { text: string }
 * Response: { styleGuide: string }
 */
router.post('/api/generate-style-guide', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const styleGuide = await generateStyleGuide(text);
    res.json({ styleGuide });

  } catch (error) {
    console.error('Style guide generation error:', error.message);
    // Return default instead of error for non-critical operation
    res.json({
      styleGuide: 'Professional, clear, and engaging style following Reach Publishers standards.'
    });
  }
});

// ============================================================================
// DOCUMENT GENERATION ENDPOINT
// ============================================================================

/**
 * POST /api/generate-docx
 * Generate a Word document with Track Changes
 *
 * Body: { originalText: string, editedText: string, fileName?: string }
 * Response: Binary .docx file
 */
router.post('/api/generate-docx', async (req, res) => {
  try {
    const { originalText, editedText, fileName } = req.body;

    if (!originalText || !editedText) {
      return res.status(400).json({ error: 'Missing originalText or editedText' });
    }

    console.log('Generating document with Native Track Changes...');
    console.log('Original length:', originalText.length, 'characters');
    console.log('Edited length:', editedText.length, 'characters');

    const buffer = await generateDocxBuffer(originalText, editedText);

    const outputFileName = fileName || 'edited_document.docx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${outputFileName}"`
    );
    res.send(buffer);

    console.log('Document generated successfully:', outputFileName);

  } catch (error) {
    console.error('Document generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
