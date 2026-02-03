/**
 * =============================================================================
 * ANTHROPIC SERVICE - Claude AI Communication
 * =============================================================================
 *
 * This service handles all communication with the Anthropic Claude API.
 * It sends manuscript text to Claude for editing according to the
 * Reach Publishers House Style Guide.
 *
 * API CONFIGURATION:
 * ------------------
 * - Model: claude-sonnet-4-20250514 (Claude Sonnet 4)
 * - Max tokens: 4000 (sufficient for ~2000 word chunks)
 * - API Version: 2023-06-01
 *
 * AUTHENTICATION:
 * ---------------
 * Requires ANTHROPIC_API_KEY environment variable.
 * Key format: sk-ant-api03-... (starts with sk-ant-)
 * Set in .env file for local development, Docker env for production.
 *
 * EDITING WORKFLOW:
 * -----------------
 * 1. First chunk: Claude receives style guide + editing instructions
 * 2. After first chunk: Generate document-specific style guide summary
 * 3. Subsequent chunks: Include style guide summary for consistency
 *
 * This two-phase approach ensures:
 * - Consistent voice throughout the document
 * - Same terminology and formatting choices
 * - Coherent editing across all sections
 *
 * PROMPT ENGINEERING:
 * -------------------
 * The system prompt includes:
 * - Full Reach Publishers House Style Guide
 * - Instructions to return ONLY edited text (no explanations)
 * - Context from previous sections (for subsequent chunks)
 *
 * ERROR HANDLING:
 * ---------------
 * - API errors are thrown and handled by the calling route
 * - Style guide generation fails gracefully with default
 * - Frontend implements retry logic for transient failures
 *
 * EXPORTS:
 * --------
 * - editChunk: Edit a text chunk using Claude
 * - generateStyleGuide: Create consistency guide from first chunk
 * - makeAnthropicRequest: Low-level API request function
 * - MODEL, ANTHROPIC_API_URL: Configuration constants
 *
 * =============================================================================
 */

const { STYLE_GUIDE } = require('../config/styleGuide');

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * Anthropic API endpoint for chat completions
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * API version header - required by Anthropic
 */
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Claude model to use for editing
 * Sonnet 4 provides good balance of quality and speed for editing tasks
 */
const MODEL = 'claude-sonnet-4-20250514';

/**
 * API request timeout in milliseconds (4 minutes)
 * Claude can take a while for large chunks; this prevents indefinite hangs
 */
const API_TIMEOUT_MS = 4 * 60 * 1000;

// =============================================================================
// LOW-LEVEL API COMMUNICATION
// =============================================================================

/**
 * Make a request to the Anthropic API with timeout.
 *
 * This is the core function that handles HTTP communication with Claude.
 * It adds authentication headers, timeout handling, and error responses.
 *
 * @param {Object} body - Request body matching Anthropic API schema
 * @returns {Promise<Object>} Parsed API response
 * @throws {Error} If API key missing, request fails, timeout, or response invalid
 */
async function makeAnthropicRequest(body) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Validate API key exists
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // Make HTTP request to Anthropic API with timeout
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    // Handle non-200 responses
    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Failed to parse error response, use default message
      }
      throw new Error(errorMessage);
    }

    // Parse response
    const data = await response.json();

    // Validate response structure
    if (!data.content || !data.content[0] || typeof data.content[0].text !== 'string') {
      throw new Error('Invalid API response: missing or malformed content');
    }

    return data;
  } catch (error) {
    // Handle timeout specifically
    if (error.name === 'AbortError') {
      throw new Error('API request timed out after 4 minutes');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// EDITING FUNCTIONS
// =============================================================================

/**
 * Edit a chunk of manuscript text using Claude.
 *
 * Sends text to Claude with the Reach Publishers style guide and
 * instructions to return only the edited text.
 *
 * @param {string} text - The text chunk to edit (~2000 words)
 * @param {string} styleGuide - Document-specific style notes (for consistency)
 * @param {boolean} isFirst - True if this is the first chunk (no prior context)
 * @returns {Promise<string>} The edited text
 */
async function editChunk(text, styleGuide, isFirst) {
  // Build the system prompt with style guide and instructions
  const systemPrompt = buildEditingPrompt(styleGuide, isFirst);

  // Send to Claude - the text to edit is the user message
  const data = await makeAnthropicRequest({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }]
  });

  // Return just the edited text
  return data.content[0].text;
}

/**
 * Build the system prompt for editing.
 *
 * The prompt includes:
 * 1. Role definition (professional book editor)
 * 2. Full Reach Publishers House Style Guide
 * 3. Context from previous sections (if not first chunk)
 * 4. Instruction to return only edited text
 *
 * @param {string} styleGuide - Document-specific style notes
 * @param {boolean} isFirst - Whether this is the first chunk
 * @returns {string} Complete system prompt
 */
function buildEditingPrompt(styleGuide, isFirst) {
  // Base prompt with role and style guide
  const basePrompt = `You are a professional book editor for Reach Publishers. You MUST follow the Reach Publishers House Style Guide strictly and without exception.

${STYLE_GUIDE}`;

  // Context-specific instructions
  const contextPrompt = isFirst
    ? 'Edit this text following ALL the rules above. Fix grammar, spelling, punctuation, consistency, clarity, and style. Maintain the author\'s voice while improving readability.'
    : `Edit this text following ALL the rules above AND maintain consistency with this established style from earlier sections: ${styleGuide}`;

  // Combine with output instructions
  return `${basePrompt}

${contextPrompt}

Return ONLY the edited text with no preamble, no explanations, no comments - just the corrected text ready for publication.`;
}

/**
 * Generate a document-specific style guide from the first edited chunk.
 *
 * After editing the first chunk, we ask Claude to summarize the style
 * decisions it made. This summary is then included in prompts for
 * subsequent chunks to ensure consistency throughout the document.
 *
 * @param {string} editedText - The first edited chunk
 * @returns {Promise<string>} Brief style guide (3-4 sentences)
 */
async function generateStyleGuide(editedText) {
  // Default fallback if generation fails
  const defaultGuide = 'Professional, clear, and engaging style following Reach Publishers standards.';

  // Can't generate without API key
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
    // Style guide generation is non-critical - log and return default
    console.error('Style guide generation error:', error.message);
    return defaultGuide;
  }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  // Main editing functions
  editChunk,
  generateStyleGuide,

  // Low-level API access (for testing/debugging)
  makeAnthropicRequest,

  // Configuration (for reference)
  MODEL,
  ANTHROPIC_API_URL
};
