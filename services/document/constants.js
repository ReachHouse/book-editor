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

// TEMPORARY: Set to true to disable all comments for debugging
// If document opens cleanly with this true, comments are the issue
const DISABLE_COMMENTS = false;

// Inline comments on track changes - testing with single-paragraph content
const DISABLE_INLINE_COMMENTS = false;

// Per Reach Publishers style guide: highlight changes in red for visibility
// This adds red highlighting to insertions AND tracks it as a formatting revision
const HIGHLIGHT_INSERTIONS = true;

// docx highlight colors: yellow, green, cyan, magenta, blue, red,
// darkBlue, darkCyan, darkGreen, darkMagenta, darkRed, darkYellow, gray, lightGray, black
const INSERTION_HIGHLIGHT_COLOR = "yellow";

module.exports = {
  SIGNIFICANT_CHANGE_THRESHOLD,
  AUTHOR,
  DISABLE_COMMENTS,
  DISABLE_INLINE_COMMENTS,
  HIGHLIGHT_INSERTIONS,
  INSERTION_HIGHLIGHT_COLOR
};
