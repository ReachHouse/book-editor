/**
 * Application Version — Single source of truth for version tracking.
 *
 * Update before each release:
 *   1. Bump VERSION (semver: MAJOR.MINOR.PATCH)
 *   2. Set VERSION_TAG (Overhaul | Feature | Security | Refactor | Bugfix | Hotfix | UI | Docs | Config)
 *   3. Set VERSION_DATE to today
 *
 * Full version history lives in CHANGELOG.md.
 */

export const VERSION = '1.57.0';
export const VERSION_TAG = 'Refactor';
export const VERSION_DATE = '2026-02-07';
export const VERSION_DISPLAY = `v${VERSION} [${VERSION_TAG}]`;
