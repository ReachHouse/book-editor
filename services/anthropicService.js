/**
 * =============================================================================
 * ANTHROPIC SERVICE - Claude AI Communication
 * =============================================================================
 *
 * This service handles all communication with the Anthropic Claude API.
 * It sends manuscript text to Claude for editing according to the
 * Reach House House Style Guide.
 *
 * FEATURES:
 * ---------
 * - Circuit breaker pattern to prevent cascading failures
 * - Structured logging for production monitoring
 * - Timeout handling with AbortController
 * - Response validation
 *
 * =============================================================================
 */

const { STYLE_GUIDE } = require('../config/styleGuide');
const logger = require('./logger');
const { ServiceUnavailableError } = require('./errors');

// =============================================================================
// API CONFIGURATION
// =============================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-20250514';
const API_TIMEOUT_MS = 4 * 60 * 1000;

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

/**
 * Simple circuit breaker to prevent repeated calls to a failing service.
 *
 * States:
 * - CLOSED:    Normal operation, requests go through
 * - OPEN:      Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered (one request allowed)
 *
 * Transitions:
 * - CLOSED -> OPEN: After FAILURE_THRESHOLD consecutive failures
 * - OPEN -> HALF_OPEN: After RESET_TIMEOUT_MS has elapsed
 * - HALF_OPEN -> CLOSED: If the test request succeeds
 * - HALF_OPEN -> OPEN: If the test request fails
 */
const circuitBreaker = {
  state: 'CLOSED', // CLOSED | OPEN | HALF_OPEN
  failures: 0,
  lastFailureTime: null,
  FAILURE_THRESHOLD: 5,
  RESET_TIMEOUT_MS: 60 * 1000,

  /**
   * Check if requests are allowed through the circuit.
   * @returns {boolean}
   */
  canRequest() {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() - this.lastFailureTime >= this.RESET_TIMEOUT_MS) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN');
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow one request through
    return true;
  },

  /**
   * Record a successful request.
   */
  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      logger.info('Circuit breaker CLOSED (service recovered)');
    }
    this.failures = 0;
    this.state = 'CLOSED';
  },

  /**
   * Record a failed request.
   */
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.FAILURE_THRESHOLD) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker OPEN', { failures: this.failures });
    }
  }
};

// =============================================================================
// LOW-LEVEL API COMMUNICATION
// =============================================================================

/**
 * Make a request to the Anthropic API with timeout and circuit breaker.
 *
 * @param {Object} body - Request body matching Anthropic API schema
 * @returns {Promise<Object>} Parsed API response
 * @throws {Error} If API key missing, request fails, timeout, or response invalid
 */
async function makeAnthropicRequest(body) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new ServiceUnavailableError('ANTHROPIC_API_KEY is not configured');
  }

  // Circuit breaker check
  if (!circuitBreaker.canRequest()) {
    throw new ServiceUnavailableError(
      'Claude API is temporarily unavailable. Please try again in a minute.'
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const startTime = Date.now();

  try {
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

    const duration = Date.now() - startTime;

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

      // 5xx errors trip the circuit breaker; 4xx errors are client issues
      if (response.status >= 500) {
        circuitBreaker.onFailure();
      }

      logger.error('Anthropic API error', {
        status: response.status,
        duration,
        error: errorMessage
      });

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || typeof data.content[0].text !== 'string') {
      throw new Error('Invalid API response: missing or malformed content');
    }

    circuitBreaker.onSuccess();
    logger.debug('Anthropic API request succeeded', { duration, model: body.model });

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      circuitBreaker.onFailure();
      throw new Error('API request timed out after 4 minutes');
    }
    // Network errors also trip the breaker
    if (error.message.includes('fetch') || error.message.includes('network')) {
      circuitBreaker.onFailure();
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
 * @param {string} text - The text chunk to edit (~2000 words)
 * @param {string} styleGuide - Document-specific style notes (for consistency)
 * @param {boolean} isFirst - True if this is the first chunk (no prior context)
 * @param {string|null} customStyleGuide - User-customized style guide (optional)
 * @returns {Promise<{ text: string, usage: Object|null }>}
 */
async function editChunk(text, styleGuide, isFirst, customStyleGuide = null) {
  const systemPrompt = buildEditingPrompt(styleGuide, isFirst, customStyleGuide);

  const data = await makeAnthropicRequest({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }]
  });

  return {
    text: data.content[0].text,
    usage: data.usage || null
  };
}

/**
 * Build the system prompt for editing.
 *
 * @param {string} styleGuide - Document-specific style notes
 * @param {boolean} isFirst - Whether this is the first chunk
 * @param {string|null} customStyleGuide - User-customized style guide (optional)
 * @returns {string} Complete system prompt
 */
function buildEditingPrompt(styleGuide, isFirst, customStyleGuide = null) {
  const effectiveStyleGuide = customStyleGuide && customStyleGuide.trim()
    ? customStyleGuide
    : STYLE_GUIDE;

  const basePrompt = `You are a professional book editor for Reach House. You MUST follow the Reach House House Style Guide strictly and without exception.

${effectiveStyleGuide}`;

  const contextPrompt = isFirst
    ? 'Edit this text following ALL the rules above. Fix grammar, spelling, punctuation, consistency, clarity, and style. Maintain the author\'s voice while improving readability.'
    : `Edit this text following ALL the rules above AND maintain consistency with this established style from earlier sections: ${styleGuide}`;

  return `${basePrompt}

${contextPrompt}

Return ONLY the edited text with no preamble, no explanations, no comments - just the corrected text ready for publication.`;
}

/**
 * Generate a document-specific style guide from the first edited chunk.
 *
 * @param {string} editedText - The first edited chunk
 * @returns {Promise<{ text: string, usage: Object|null }>}
 */
async function generateStyleGuide(editedText) {
  const defaultGuide = 'Professional, clear, and engaging style following Reach House standards.';

  if (!process.env.ANTHROPIC_API_KEY) {
    return { text: defaultGuide, usage: null };
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

    return {
      text: data.content[0].text,
      usage: data.usage || null
    };
  } catch (error) {
    logger.error('Style guide generation error', { error: error.message });
    return { text: defaultGuide, usage: null };
  }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  editChunk,
  generateStyleGuide,
  makeAnthropicRequest,
  MODEL,
  ANTHROPIC_API_URL,
  // Exported for testing
  _circuitBreaker: circuitBreaker
};
