/**
 * =============================================================================
 * APPLICATION VERSION SYSTEM
 * =============================================================================
 *
 * This file controls the version number displayed in the application footer.
 * It is the SINGLE SOURCE OF TRUTH for version tracking.
 *
 * IMPORTANT FOR FUTURE DEVELOPERS (Human or AI):
 * ----------------------------------------------
 * When making changes to this codebase, you MUST update this file to reflect
 * the new version. This helps track what has changed and when.
 *
 * HOW TO UPDATE:
 * --------------
 * 1. Determine what type of change you made (see TAG OPTIONS below)
 * 2. Update VERSION following semantic versioning rules
 * 3. Update VERSION_TAG to match your change type
 * 4. Update VERSION_DATE to today's date
 * 5. Commit and push
 *
 * VERSION FORMAT: MAJOR.MINOR.PATCH (Semantic Versioning)
 * -------------------------------------------------------
 * - MAJOR (X.0.0): Breaking changes, major overhauls, or complete rewrites
 *                  Example: Complete UI redesign, API changes that break clients
 * - MINOR (1.X.0): New features, significant improvements that are backward-compatible
 *                  Example: Adding a new export format, new editing capabilities
 * - PATCH (1.1.X): Bug fixes, small updates, documentation changes
 *                  Example: Fixing a typo, correcting a calculation error
 *
 * TAG OPTIONS (Use in VERSION_TAG):
 * ---------------------------------
 * - 'Overhaul'  : Major restructuring or complete rewrite (bump MAJOR)
 * - 'Feature'   : New functionality added (bump MINOR)
 * - 'Security'  : Security fixes and hardening (bump MINOR)
 * - 'Refactor'  : Code improvements without changing behavior (bump MINOR or PATCH)
 * - 'Bugfix'    : Bug fixes (bump PATCH)
 * - 'Hotfix'    : Urgent production fixes (bump PATCH)
 * - 'UI'        : User interface changes only (bump MINOR or PATCH)
 * - 'Docs'      : Documentation updates only (bump PATCH)
 * - 'Config'    : Configuration/build changes (bump PATCH)
 *
 * EXAMPLES:
 * ---------
 * - Fixed paragraph alignment bug:     VERSION='1.1.1', VERSION_TAG='Bugfix'
 * - Added PDF export feature:          VERSION='1.2.0', VERSION_TAG='Feature'
 * - Refactored monolithic App.jsx:     VERSION='1.1.0', VERSION_TAG='Refactor'
 * - Updated all comments in codebase:  VERSION='1.1.1', VERSION_TAG='Docs'
 * - Complete rewrite with new tech:    VERSION='2.0.0', VERSION_TAG='Overhaul'
 *
 * VERSION HISTORY:
 * ----------------
 * v1.3.1 [Bugfix]   - 2026-02-02: Fix Word "unreadable content" error - enable trackRevisions
 * v1.3.0 [Feature]  - 2026-02-02: Add Word comments - summary & inline change explanations
 * v1.2.1 [Bugfix]   - 2026-02-02: Fix empty Track Changes entries, improve change merging
 * v1.2.0 [Security] - 2026-02-02: Security hardening, bug fixes, code quality improvements
 * v1.1.1 [Docs]     - 2026-02-02: Comprehensive documentation across entire codebase
 * v1.1.0 [Refactor] - 2026-02-02: Split monolithic code into modules, fixed diff
 * v1.0.0 [Initial]  - Initial release
 *
 * DISPLAY LOCATION:
 * -----------------
 * The VERSION_DISPLAY is shown in the footer of App.jsx, above the copyright.
 *
 * =============================================================================
 */

/**
 * Current application version (Semantic Versioning)
 * Format: MAJOR.MINOR.PATCH
 */
export const VERSION = '1.3.1';

/**
 * Tag describing the type of changes in this version
 * Must be one of: Overhaul, Feature, Security, Refactor, Bugfix, Hotfix, UI, Docs, Config
 */
export const VERSION_TAG = 'Bugfix';

/**
 * Date of this version release (YYYY-MM-DD format)
 */
export const VERSION_DATE = '2026-02-02';

/**
 * Combined display string shown in the UI footer
 * Format: "v1.1.0 [Refactor]"
 */
export const VERSION_DISPLAY = `v${VERSION} [${VERSION_TAG}]`;
