/**
 * =============================================================================
 * DOCUMENT SERVICE - DEPRECATED
 * =============================================================================
 *
 * DEPRECATION NOTICE:
 * This file has been replaced by the modular structure in services/document/
 * It is kept for backwards compatibility but will be removed in a future version.
 *
 * The new structure is:
 *   services/document/
 *   ├── index.js         - Main entry point (use this)
 *   ├── constants.js     - Configuration values
 *   ├── utils.js         - Helper functions
 *   ├── categorization.js- Change categorization
 *   ├── comments.js      - Comment creation
 *   ├── formatting.js    - Text formatting
 *   ├── paragraphs.js    - Paragraph creation
 *   └── generation.js    - Document generation
 *
 * Please update imports to use: require('./services/document')
 *
 * =============================================================================
 */

// Re-export from new modular structure for backwards compatibility
module.exports = require('./document');
