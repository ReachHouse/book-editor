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
 * v1.43.2 [UI]       - 2026-02-05: Align spinner with Complete step — move spinner from header to Complete step icon position, shows spinner while processing and checkmark when done
 * v1.43.1 [Bugfix]   - 2026-02-05: Fix 504 timeout on large document downloads — increase frontend DOCX generation timeout from 3 to 5 minutes to match server timeout (large manuscripts with 40+ sections were timing out before generation completed)
 * v1.43.0 [UI]       - 2026-02-06: Design system standardization — text-[10px]→text-xs, glass-inner p-3.5→p-4, w-11→w-10 buttons, mb-5→mb-6 section spacing, mb-2.5→mb-2, gap-2.5→gap-2, h-1.5→h-2 progress bars, text-xl→text-lg headings, asymmetric padding fixes, consistent surface-400/500 text colors
 * v1.42.0 [UI]       - 2026-02-06: Rebrand to "Reach House Book Editor" — update title across all pages, standardize typography (remove font-light, consistent text-sm/text-xs sizing, semibold for card titles), rename style guide references to "Reach House Style Guide", update copyright to "Reach House"
 * v1.41.4 [UI]       - 2026-02-06: ProcessingView alignment — align spinner icon with step indicator icons (matching size w-9/h-9, px-2 padding), fix progress bar percentage positioning (flexbox instead of absolute)
 * v1.41.3 [Feature]  - 2026-02-06: Admin invite code deletion — add delete button for unused invite codes in Admin Dashboard, backend DELETE endpoint, confirmation dialog, prevents deletion of already-used codes
 * v1.41.2 [Refactor] - 2026-02-05: Code quality fixes — fix critical API bug (completeSetup missing setup_secret), extract shared PasswordStrength component, fix AdminDashboard setTimeout memory leak with useRef cleanup, harden deploy.sh with safe .env parser (452 total)
 * v1.41.1 [Bugfix]   - 2026-02-05: Fix SetupWizard browser autofill bug — use refs to read DOM values on submit; deploy.sh uses .env (auto-loaded by Docker), migrates from .env.local, prevents duplicate entries, secure file permissions (452 total)
 * v1.41.0 [UI]       - 2026-02-05: Production polish release — skip-to-content link for keyboard navigation, prefers-reduced-motion for motion-sensitive users, empty state designs in SavedProjects and InviteCodes, password strength indicator with live visual feedback in RegisterPage and SetupWizard, improved color contrast in AdminDashboard used codes, semantic HTML (main/footer tags), proper aria-describedby for password fields (452 total)
 * v1.40.2 [Config]   - 2026-02-05: Automated deployment — deploy.sh now auto-generates SETUP_SECRET and JWT_SECRET, stores in .env, displays secret prominently on first deployment for easy setup wizard completion (452 total)
 * v1.40.1 [Security] - 2026-02-05: CRITICAL FIX — setup wizard now requires SETUP_SECRET env var to prevent unauthorized admin account creation on fresh deployments, timing-safe secret comparison, frontend displays setup disabled warning, 4 new security tests (452 total)
 * v1.40.0 [UI]       - 2026-02-05: Accessibility & polish — focus trap in StyleGuideModal, ARIA tab roles in AdminDashboard, aria-labels on icon buttons, role="alert" on error containers, form label associations with htmlFor/id, visible focus indicators with peer-focus-visible, ErrorDisplay role="alert" (448 total)
 * v1.39.5 [Docs]     - 2026-02-05: Polish release — add 6 tests for new batch query methods (getAllDailyUsage, getAllMonthlyUsage, getAllCounts), verify code comments, cleanup (448 total)
 * v1.39.0 [Refactor] - 2026-02-05: Performance optimizations — fix N+1 queries in admin endpoints (3→1 batch queries), React.lazy for AdminDashboard/SetupWizard, static asset caching (1 year for versioned files), optimistic updates in useProjects (442 total)
 * v1.38.0 [Security] - 2026-02-05: Security & reliability hardening — Permissions-Policy header, input validation for fullEditedText/styleGuide/projectId, DB health check in /health endpoint, graceful DB init error handling, .env.example documentation (442 total)
 * v1.37.0 [Bugfix]   - 2026-02-05: Regression archaeology — fix authService.js input normalization (trim/lowercase email, uppercase invite code) to match setup.js, align bcrypt salt rounds (setup.js 12→10 to match authService.js), verify all modules load cleanly, API↔service↔DB contract alignment (550 total)
 * v1.36.0 [Feature]  - 2026-02-05: First-run setup wizard — browser-based admin account creation when no users exist, no hardcoded credentials, secure /api/setup endpoints with validation, SetupWizard component, 15 new tests (550 total)
 * v1.35.0 [Config]   - 2026-02-05: Simple default credentials — admin password defaults to "ChangeMe123!" and invite code to "WELCOME2025" for easy first-time setup, no digging through logs (535 total)
 * v1.34.0 [Bugfix]   - 2026-02-05: Input validation & race conditions — FileUpload validates file size (50MB max) and type before upload with error display, SavedProjects delete button loading state prevents double-click race condition, updated tests (535 total)
 * v1.33.0 [Bugfix]   - 2026-02-05: Reliability hardening — separate JWT verification from DB lookup in auth middleware (prevents error masking), fix UsageDisplay unmount race condition, add unique IDs to debug logs, add accessibility to DebugLog, validate style guide config at load time (535 total)
 * v1.32.0 [Bugfix]   - 2026-02-05: Production hardening — graceful shutdown with interval cleanup, uncaughtException/unhandledRejection handlers, server error listener, consistent token expiry timestamps, JSON serialization error handling, null check on project save, frontend setTimeout cleanup in useToast and StyleGuideModal (535 total)
 * v1.31.0 [Bugfix]   - 2026-02-05: Deep audit & polish — safeJsonParse for corrupted DB data, fix date reuse in login lockout, email length validation (254 max), token limit upper bounds (100M max), logout validation, conditional console logging, URL memory leak fix in downloadDocument, 4 new regression tests (535 total)
 * v1.30.0 [Security] - 2026-02-05: Security hardening — Helmet.js security headers (CSP, X-Frame-Options, HSTS), stronger password requirements (uppercase, lowercase, number), error IDs for debugging, frontend password validation, 6 new tests (531 total)
 * v1.29.1 [Bugfix]   - 2026-02-05: Deep audit — fix negative limit parameter in usage history endpoint, add LimitEditor client-side validation, update Header JSDoc, add regression tests (528 total)
 * v1.29.0 [Feature]  - 2026-02-05: Admin dashboard — user management (list/update/delete users, role toggle, limits editor), invite code management (list/generate codes), AdminDashboard component with tabs, 5 admin API endpoints, 37 new tests (526 total)
 * v1.28.0 [Feature]  - 2026-02-05: Usage tracking & limits — log token usage per API call, enforce daily/monthly limits (429), usage summary endpoints, admin stats, frontend UsageDisplay with progress bars (471 tests)
 * v1.27.0 [Feature]  - 2026-02-05: Server-side project storage — CRUD endpoints, SQLite upsert, metadata-only listing, full-project fetch, 50 project limit, frontend API migration (440 tests)
 * v1.26.1 [Bugfix]   - 2026-02-05: Deep audit — fix registration race condition, session datetime format, stale login data, DB update bug, JSON parse errors; add rate limiting on refresh, periodic session cleanup, shared auth constants, logout loading state; clear passwords from state, remove dead code, update tests (396 total)
 * v1.26.0 [Feature]  - 2026-02-05: Full-stack authentication — JWT access/refresh tokens, bcrypt passwords, invite-code registration, login with lockout, auth middleware, AuthContext, LoginPage, RegisterPage, protected API routes, 75 new auth tests (396 total)
 * v1.25.0 [Feature]  - 2026-02-05: SQLite database foundation — schema, migrations, user/session/usage tables, Docker volume persistence, 60 database tests
 * v1.24.0 [Bugfix]   - 2026-02-05: Request persistent storage to prevent browser eviction, fix migration data loss, warn on non-persistent storage
 * v1.23.0 [Bugfix]   - 2026-02-05: Fix storage display not updating after deletion, increase storage limit to 100MB
 * v1.22.0 [Bugfix]   - 2026-02-04: Fix handleResume stuck state, handleReset stale error, chunkSize legacy resume, progressPercent NaN, stale JSDoc
 * v1.21.0 [Bugfix]   - 2026-02-04: Fix double formatFileName bug (_EDITED_EDITED), remove dead checkApiStatus, gitignore stale build artifacts
 * v1.20.0 [Refactor] - 2026-02-04: Fix stale closure bug, fix storageInfo prop, remove dead CSS/config, align keyframes, CSS utility extraction, timer cleanup
 * v1.19.0 [UI]       - 2026-02-04: Step progress indicator, user-friendly logs, project state badges, filename tooltips
 * v1.18.0 [Refactor] - 2026-02-04: Inline styles to CSS utilities, useCallback optimization, shimmer duration fix
 * v1.17.0 [UI]       - 2026-02-04: Toast notifications, modal exit animations, button active states, Escape key support
 * v1.16.0 [UI]       - 2026-02-04: Delete confirmation dialog, 44px touch targets, ARIA labels, focus ring visibility
 * v1.15.1 [UI]       - 2026-02-04: Unified typography scale, consistent spacing rhythm, heading hierarchy
 * v1.15.0 [UI]       - 2026-02-04: Liquid glass redesign, Track Changes bug fix, dead code cleanup
 * v1.14.0 [Refactor] - 2026-02-03: Code optimizations, gzip compression, Docker build improvements
 * v1.13.0 [Feature]  - 2026-02-03: Add frontend component tests (48 tests for 7 components)
 * v1.12.0 [Refactor] - 2026-02-03: Split documentService.js into modular structure (7 modules)
 * v1.11.0 [Feature]  - 2026-02-03: Docker memory limits, ARIA labels for accessibility, deployment rollback
 * v1.10.0 [Refactor] - 2026-02-03: Code quality improvements, input validation, deployment hardening
 * v1.9.1 [Security] - 2026-02-03: Add rate limiting, fix error leakage, improve stability
 * v1.9.0 [Bugfix]   - 2026-02-03: Fix 8 style rule detection issues in modularized styleRules
 * v1.8.3 [Feature]  - 2026-02-03: Add localStorage warning, Oxford comma rule, em-dash/en-dash rule (31 rules)
 * v1.8.2 [Bugfix]   - 2026-02-03: Fix minor issues - quotes regex, revision IDs, speaker detection, homophone rules
 * v1.8.1 [Bugfix]   - 2026-02-03: Fix italics rendering - integrate parsing into document generation pipeline
 * v1.8.0 [Feature]  - 2026-02-03: Italics support, concord detection, dialogue structure rules (29 total rules)
 * v1.7.0 [Feature]  - 2026-02-03: Full style guide coverage, formatting revision tracking, proper noun & word simplification rules
 * v1.6.0 [Feature]  - 2026-02-03: Yellow highlighting on insertions, homophones & practice/practise rules
 * v1.5.0 [Feature]  - 2026-02-03: Enhanced comments with style rule detection, before/after text
 * v1.4.1 [Config]   - 2026-02-03: Add Jest test infrastructure with 90 tests for services and API
 * v1.4.0 [Feature]  - 2026-02-02: Upgrade docx library 8.2.0 -> 9.5.1, use official demo syntax
 * v1.3.7 [Bugfix]   - 2026-02-02: Fix comment content - single paragraph, v8.2.0 compatible syntax
 * v1.3.6 [Bugfix]   - 2026-02-02: Fix comment syntax per docx demo (IDs, TextRun.children wrapper)
 * v1.3.5 [Bugfix]   - 2026-02-03: Fix inline comments - anchor after track changes, not wrapping
 * v1.3.4 [Bugfix]   - 2026-02-03: Fix comment creation - use plain objects, not Comment class
 * v1.3.3 [Bugfix]   - 2026-02-03: Fix DOCX comments - fix dates, remove unicode
 * v1.3.2 [Bugfix]   - 2026-02-02: Fix nested comment ranges causing Word "unreadable content"
 * v1.3.1 [Bugfix]   - 2026-02-03: Fix Word "unreadable content" error in comment feature
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
export const VERSION = '1.43.2';

/**
 * Tag describing the type of changes in this version
 * Must be one of: Overhaul, Feature, Security, Refactor, Bugfix, Hotfix, UI, Docs, Config
 */
export const VERSION_TAG = 'UI';

/**
 * Date of this version release (YYYY-MM-DD format)
 */
export const VERSION_DATE = '2026-02-05';

/**
 * Combined display string shown in the UI footer
 * Format: "v1.1.0 [Refactor]"
 */
export const VERSION_DISPLAY = `v${VERSION} [${VERSION_TAG}]`;
