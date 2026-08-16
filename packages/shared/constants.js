/**
 * constants.js — Single source of truth for all enums used by:
 *   - scripts/build-content.js (validation)
 *   - apps/server (API validation)
 *   - apps/web (rendering/filtering)
 *
 * ENGINEERING_RULES.md §2: constants centralized here, SCREAMING_SNAKE_CASE.
 * ENGINEERING_RULES.md §4: both apps/web and apps/server import from here, never redefine locally.
 *
 * Any value added here is a deliberate, reviewed change — not a per-file invention.
 */

// ── Content status ────────────────────────────────────────────────────────────
export const STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  DEPRECATED: 'deprecated',
});

// ── Difficulty levels ─────────────────────────────────────────────────────────
export const DIFFICULTY = Object.freeze({
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
});

// ── Supported operating systems ───────────────────────────────────────────────
export const SUPPORTED_OS = Object.freeze({
  LINUX: 'linux',
  MACOS: 'macos',
  WINDOWS: 'windows',
  UNIX: 'unix',
});

// ── Supported shells ──────────────────────────────────────────────────────────
export const SUPPORTED_SHELL = Object.freeze({
  BASH: 'bash',
  ZSH: 'zsh',
  SH: 'sh',
  FISH: 'fish',
  POWERSHELL: 'powershell',
  CMD: 'cmd',
});

// ── Canonical topic list (PROJECT_CONTEXT.md §8) ──────────────────────────────
// Display-case names exactly as they appear in §8. The slug form is derived by
// the canonicalizeCategorySlug() function below — never stored here separately.
// Adding a topic here is how a new top-level category becomes allowed.
export const CANONICAL_TOPICS = Object.freeze([
  'Linux',
  'Unix',
  'Bash',
  'PowerShell',
  'Git',
  'Docker',
  'Kubernetes',
  'Networking',
  'Kernel',
  'System Calls',
  'Shell Scripting',
  'SSH',
  'Cron',
  'Regex',
  'Text Processing',
  'File Systems',
  'Permissions',
  'Processes',
  'Package Managers',
  'Cloud CLI',
  'DevOps Utilities',
]);

/**
 * canonicalizeCategorySlug — ADR-008 / CONTENT_GUIDELINES.md §3.
 *
 * Converts a PROJECT_CONTEXT.md §8 display-case topic name into its canonical
 * category slug: lowercase, spaces to hyphens, no other transformation.
 *
 * "DevOps Utilities" → "devops-utilities"
 * "Package Managers" → "package-managers"
 *
 * This is the ONE place this transformation is implemented. Both the build
 * pipeline and any future authoring tools import and call this function —
 * never re-derive the rule by hand in another file.
 *
 * @param {string} displayName - A topic display name from CANONICAL_TOPICS.
 * @returns {string} The canonical slug form.
 */
export function canonicalizeCategorySlug(displayName) {
  return displayName.toLowerCase().replace(/ /g, '-');
}

// Pre-computed set of all valid top-level category slugs, derived from CANONICAL_TOPICS.
// Used by the validation stage to check category: values in frontmatter.
export const VALID_CATEGORY_SLUGS = Object.freeze(
  new Set(CANONICAL_TOPICS.map(canonicalizeCategorySlug))
);

// ── Required command frontmatter fields (CONTENT_GUIDELINES.md §4) ────────────
export const REQUIRED_COMMAND_FIELDS = Object.freeze([
  'slug',
  'name',
  'category',
  'difficulty',
  'supportedOS',
  'status',
]);

// ── Required workflow frontmatter fields (CONTENT_GUIDELINES.md §5) ───────────
export const REQUIRED_WORKFLOW_FIELDS = Object.freeze([
  'slug',
  'title',
  'category',
  'difficulty',
  'steps',
  'status',
]);

// ── Required category frontmatter fields (CONTENT_GUIDELINES.md §6) ──────────
export const REQUIRED_CATEGORY_FIELDS = Object.freeze([
  'slug',
  'name',
  'description',
  'status',
  'parent', // required but may be null; see CONTENT_GUIDELINES.md §6
]);

// ── Required command body sections (CONTENT_GUIDELINES.md §7) ─────────────────
// Order is enforced — the pipeline checks both presence AND sequence.
export const REQUIRED_COMMAND_SECTIONS = Object.freeze([
  'What is it?',
  'Why does it exist?',
  'Syntax',
  'Flags',
  'Examples',
  'Real-World Scenarios',
  'When should it NOT be used?',
  'Alternatives',
  'How it works internally',
  'Performance Notes',
  'Security Notes',
  'Common Mistakes',
  'Best Practices',
  'Interview Questions',
  'Practice Problems',
  'References',
]);

// ── Global search index size budget (ARCHITECTURE.md §6, ADR-011) ─────────────
// Ceiling increased to 500 KB to accommodate expanding corpus.
export const GLOBAL_SEARCH_INDEX_BUDGET_BYTES = 500 * 1024;

// ── Search field boost values (ARCHITECTURE.md §9) ────────────────────────────
// Authoritative reference — never invented ad hoc in lib/search/.
// Tunable only by a change to this table, reviewed as any other constant change.
export const FIELD_BOOST = Object.freeze({
  NAME: 5,
  ALIASES: 5,
  INTENT_PHRASES: 5,
  TAGS: 3,
  CATEGORY: 3,
  CONCEPTS: 3,
  FLAGS: 3,
  RELATED_COMMANDS: 2,
  COMMON_ERRORS: 2,
  DESCRIPTION: 1,
  SUMMARY: 1,
  EXAMPLES: 1,
});

export const MATCH_TYPE_MULTIPLIER = Object.freeze({
  EXACT: 1.0,
  PREFIX: 0.85,
  FUZZY: 0.6,
  INTENT_PHRASE_EXACT: 1.5, // applied on top of FIELD_BOOST.INTENT_PHRASES
});

// ── Web Worker threshold (ARCHITECTURE.md §9) ─────────────────────────────────
// Search scoring moves off the main thread once the corpus exceeds this count.
export const SEARCH_WEB_WORKER_THRESHOLD = 500;
