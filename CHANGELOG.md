# Changelog

Canonical, reverse-chronological record of all meaningful changes merged into `main`.

**Entry rule:** One entry per merge commit (PR) to `main`, or per direct commit for the pre-PR era. Each entry includes the merge date, short hash, version (if tagged in the commit message), and a 1–2 line summary of what changed and why it matters.

**Style guide:**
- Start each description with a verb (Add, Fix, Refactor, Remove, Update)
- Focus on user-visible or architecturally significant impact
- Skip trivial whitespace/typo-only changes unless they fix a real bug

---

## 2026-02-07

- **`562539a`** — v1.56.0: Decompose AdminDashboard into focused sub-components (1009→101 lines), adopt error classes in authService, centralize default token limits, deduplicate LimitEditor/RoleDefaultsEditor, Vite code splitting (699KB→73KB main bundle). Also includes v1.55.0 hardening: fix stale JWT role, token refresh race, Jaccard similarity >1.0, circuit breaker HALF_OPEN, null hash crash, session cleanup on user delete.
- **`4f33e5d`** — Remove deprecated `update.sh` and `ROADMAP.md`, fix stale references in deploy docs and config files.
- **`1fd04a7`** — Update CLAUDE.md: clarify guidelines and fix technical inaccuracies.
- **`54289c7`** — v1.54.0: Polish pass — fix editChunk timeout, add API 404 handler, fix CORS for port 5173, repair 49 broken frontend tests, remove dead code. Add rules section to CLAUDE.md.
- **`68e752a`** — v1.53.0: Comprehensive code audit — fix X-Response-Time header bug, wire centralized config and structured logger into all files, remove duplicates. Complete roadmap (v1.38–v1.40): add logger, error classes, circuit breaker, centralized config, DB indexes, pagination, and API/deployment docs.

## 2026-02-06

- **`357a6a5`** — v1.51.0: Merge Management and Editor roles into single User role (3 roles: Admin/User/Guest). Rename Restricted→Guest with limit status tags. Simplify admin user cards.
- **`0ea3ea8`** — v1.48.0–v1.49.0: Add comprehensive role system with 4 configurable roles and token limits. Add "Continue as Guest" viewer mode. Fix security vulnerabilities in role system. Polish guest mode bugs and branding.
- **`f115e15`** — v1.47.0: Add comprehensive VPS file system documentation to CLAUDE.md (single source of truth for project structure).
- **`694c18e`** — v1.42.0: Complete rebrand from "Reach Publishers" to "Reach House". Fix rollback commands and add VPS maintenance docs.
- **`3714d9d`** — Fix deploy.sh paths and docker-compose configuration for VPS.
- **`d5c1231`** — Fix wrong VPS paths across all documentation files.
- **`609e9dd`** — v1.46.0: Add editable style guide feature. Security and bug fixes from codebase scan, consolidate duplicate code, remove dead code.
- **`e29b80a`** — v1.42.0–v1.43.1: Rebrand to "Reach House Book Editor", design system standardization, fix 504 timeout on large document downloads, improve CompletionView text clarity, align ProcessingView spinner.
- **`7b4de9e`** — Fix deploy.sh executable permission in git.
- **`7a88b9d`** — v1.41.1–v1.41.3: Comprehensive security and code quality fixes. Harden deploy.sh. Switch to `.env` for Docker secrets.

## 2026-02-05

- **`329d1a4`** — Fix SetupWizard browser autofill bug (v1.41.1) — add Docker memory limits.
- **`79ef93a`** — Fix SetupWizard browser autofill bug (v1.41.1) — prevent browsers from pre-filling setup form fields.
- **`dd08306`** — v1.39.5–v1.41.0: Production polish release. Automated deployment secrets generation. CRITICAL SECURITY FIX: setup wizard now requires SETUP_SECRET. Accessibility and polish improvements. Test coverage additions.
- **`cc234a3`** — v1.37.0–v1.38.0: Regression archaeology — fix input normalization and bcrypt bugs. Add production perfection roadmap.
- **`ac3a13b`** — v1.32.0–v1.36.0: First-run setup wizard for browser-based admin creation. Simple default credentials. Input validation and race condition fixes. Auth middleware and frontend reliability hardening. Graceful shutdown.
- **`f1d35b7`** — v1.18.0–v1.22.0: Fix state bugs and edge cases from deep data-flow audit. Fix double formatFileName bug. Polish and refinement pass. UX clarity and information design improvements. Performance and code cleanup.
- **`67407f0`** — Fix miscellaneous bugs and clean up dead code (remove unused documentService.js).
- **`b89cb83`** — Fix Track Changes creating duplicate formatting revisions. Liquid glass visual refinement.
- **`3260504`** — Liquid glass visual refinement inspired by VisionOS (frontend CSS overhaul).
- **`7d97532`** — Redesign UI with modern glass-morphism, refined visual system, and improved typography.

## 2026-02-04

- **`7d97532`** — (See 2026-02-05 — PR #11 merged across date boundary.)

## 2026-02-03

- **`2cb4592`** — v1.14.0: Code optimizations and build improvements.
- **`6ec5208`** — v1.9.1–v1.13.0: Add frontend component tests. Split documentService.js into modular `services/document/` structure. Add Docker memory limits, ARIA labels, deployment rollback. Code quality and security improvements.
- **`99ff66c`** — v1.6.0–v1.8.2: Complete style guide implementation with formatting tracking, homophone rules, yellow highlighting on insertions. Implement italics rendering, concord errors, dialogue structure detection. Fix various minor issues.
- **`7efd2cd`** — v1.5.0: Add style rule detection for enhanced Word comments (grammar, spelling, punctuation categorization).
- **`d9f8ba2`** — Add deployment scripts (`deploy.sh`, `update.sh`) for Hostinger VPS.
- **`eb60030`** — v1.4.1: Add Jest test infrastructure with 90 initial tests.
- **`0f6c98a`** — v1.3.7–v1.4.0: Upgrade docx library to v9.5.1. Fix CommentReference paragraph placement. Add built frontend files for non-Docker deployment.
- **`22f4f05`** — Remove rate limiting (caused issues), keep improved diff algorithm and environment validation.
- **`d52288f`** — Add rate limiting, environment validation, and improved LCS diff algorithm.
- **`b6cea00`** — (PR #1) Initial codebase review merge.
- **`8706a4b`** — (PR #2) Fix document download error.

## 2026-02-02 (Pre-PR Era — Direct Commits)

- **`e674fac`** — Merge review-codebase branch into main.
- **`6775ddf`** — Try Comment class instead of plain objects for comment content.
- **`686cd87`** — Fix blank comments — use single paragraph instead of multiple.
- **`c27cca4`** — Disable inline comments — only summary comment works reliably.
- **`250b853`** — v1.3.5: Fix inline comments — anchor AFTER track changes, not wrapping.
- **`259faa3`** — Test: summary comment only (disable inline comments on track changes).
- **`d60e24c`** — Test: disable comments to isolate "unreadable content" cause.
- **`20409f2`** — v1.3.4: Fix comment creation — use plain objects not Comment class.
- **`ab4f8d5`** — v1.3.3: Fix Word "unreadable content" error comprehensively.
- **`3e29da2`** — Add native Microsoft Word Track Changes support (core feature).
- **`ae2f467`** — Change port to 3002 to avoid conflict with existing server.
- **`236e539`** — Fix Dockerfile — proper multi-stage build.
- **`8f36f27`** — Fix package.json — clean dependencies.
- **`791fef4`** — Fix docker-compose.yml — remove deprecated version attribute.
- **`7ab435e`** — Initial commit: add Docker files for containerized deployment.
