/**
 * =============================================================================
 * DOCUMENT SERVICE CONSTANTS
 * =============================================================================
 *
 * Configuration values for document generation with Track Changes.
 * Centralizes all magic numbers and settings for easy modification.
 *
 * =============================================================================
 */

// Minimum word count for a change to get an inline comment
const SIGNIFICANT_CHANGE_THRESHOLD = 3;

// Author name for all comments and revisions
const AUTHOR = "AI Editor";

// Set to true to disable all comments (useful for debugging document issues)
const DISABLE_COMMENTS = false;

// Set to true to disable inline comments on individual track changes
const DISABLE_INLINE_COMMENTS = false;

module.exports = {
  SIGNIFICANT_CHANGE_THRESHOLD,
  AUTHOR,
  DISABLE_COMMENTS,
  DISABLE_INLINE_COMMENTS
};
