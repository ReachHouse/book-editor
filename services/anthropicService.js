/**
 * Anthropic Service
 * Handles communication with Claude API for text editing
 */

const { STYLE_GUIDE } = require('../config/styleGuide');

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-20250514';

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Make a request to the Anthropic API
 */
async function makeAnthropicRequest(body) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `API request failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();

  if (!data.content || !data.content[0]) {
    throw new Error('Invalid API response: missing content');
  }

  return data;
}

// ============================================================================
// EDITING FUNCTIONS
// ============================================================================

/**
 * Edit a chunk of text according to Reach Publishers style guide
 *
 * @param {string} text - The text to edit
 * @param {string} styleGuide - Document-specific style guide (for consistency)
 * @param {boolean} isFirst - Whether this is the first chunk (no prior context)
 * @returns {Promise<string>} - The edited text
 */
async function editChunk(text, styleGuide, isFirst) {
  const systemPrompt = buildEditingPrompt(styleGuide, isFirst);

  const data = await makeAnthropicRequest({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }]
  });

  return data.content[0].text;
}

/**
 * Build the system prompt for editing
 */
function buildEditingPrompt(styleGuide, isFirst) {
  const basePrompt = `You are a professional book editor for Reach Publishers. You MUST follow the Reach Publishers House Style Guide strictly and without exception.

${STYLE_GUIDE}`;

  const contextPrompt = isFirst
    ? 'Edit this text following ALL the rules above. Fix grammar, spelling, punctuation, consistency, clarity, and style. Maintain the author\'s voice while improving readability.'
    : `Edit this text following ALL the rules above AND maintain consistency with this established style from earlier sections: ${styleGuide}`;

  return `${basePrompt}

${contextPrompt}

Return ONLY the edited text with no preamble, no explanations, no comments - just the corrected text ready for publication.`;
}

/**
 * Generate a style guide summary from the first edited chunk
 * This helps maintain consistency across subsequent chunks
 *
 * @param {string} editedText - The first edited chunk
 * @returns {Promise<string>} - A brief style guide
 */
async function generateStyleGuide(editedText) {
  const defaultGuide = 'Professional, clear, and engaging style following Reach Publishers standards.';

  if (!process.env.ANTHROPIC_API_KEY) {
    return defaultGuide;
  }

  try {
    const data = await makeAnthropicRequest({
      model: MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Based on this edited text, create a brief style guide (3-4 sentences) noting: tone, formality level, punctuation preferences, and any special terminology. Text: ${editedText.substring(0, 1000)}`
      }]
    });

    return data.content[0].text;
  } catch (error) {
    console.error('Style guide generation error:', error.message);
    return defaultGuide;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  editChunk,
  generateStyleGuide,
  makeAnthropicRequest,
  MODEL,
  ANTHROPIC_API_URL
};
