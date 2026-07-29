/**
 * index.js — Public API of @commandatlas/shared.
 *
 * All consumers (scripts/, apps/web, apps/server) import from this entry point.
 * ENGINEERING_RULES.md §4: packages/shared is the only place enums/schemas are
 * defined — never re-derived locally in another package.
 */

export * from './constants.js';
