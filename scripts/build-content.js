#!/usr/bin/env node
/**
 * build-content.js — CommandAtlas content pipeline orchestrator.
 *
 * Runs the nine stages defined in ARCHITECTURE.md §2, in strict dependency order.
 * Any stage that returns an error (or throws) halts the pipeline entirely —
 * nothing partially-valid is ever published (ARCHITECTURE.md §2).
 *
 * Usage:
 *   node scripts/build-content.js               # full build (validate + generate)
 *   node scripts/build-content.js --validate-only  # structural validation only, no generation
 *
 * Stage contract:
 *   Each stage module exports a default async function with the signature:
 *     async function stageName(context, options) → void
 *
 *   `context` is a mutable object passed through every stage. Stages read from
 *   and write to it — this is how upstream output flows to downstream stages
 *   without file I/O between them. Stages must NEVER mutate their own inputs
 *   in a way that is not intentionally part of their contract (i.e., add to
 *   context, don't overwrite keys that a prior stage wrote).
 *
 *   `options` is the parsed CLI options object (e.g. { validateOnly: bool }).
 *
 * Context shape (cumulative — each stage adds its own keys):
 *
 *   After stage 01-discover:
 *     context.files: Array<{ path, type, slug, folder }>
 *       type: 'command' | 'workflow' | 'category'
 *
 *   After stage 02-parse:
 *     context.records: Array<{ path, type, frontmatter, body, rawMd }>
 *       frontmatter: parsed YAML object
 *       body: raw Markdown string after the frontmatter block
 *
 *   After stage 03-validate:
 *     context.records: same array, validated — pipeline has already halted if invalid
 *
 *   After stage 04-diff:
 *     context.diff: { added: string[], modified: string[], removed: string[] }
 *       slugs of records that changed vs. the last published manifest
 *     context.records: same, but each record now has .contentVersion resolved
 *
 *   After stage 05-gen-packs:
 *     context.packs: Map<packId, { commands: [], workflows: [], categories: [] }>
 *       packId: canonical category slug (e.g. 'linux', 'git')
 *
 *   After stage 06-gen-search:
 *     context.searchIndexes: Map<packId, invertedIndex>
 *     context.globalSearchIndex: globalIndex (name/alias/intent-phrase tier only)
 *
 *   After stage 07-gen-manifest:
 *     context.manifest: object matching generated/manifests/latest.json schema
 *
 *   After stage 08-gen-stats:
 *     context.stats: { totalCommands, totalWorkflows, totalCategories, coverageByTopic }
 *
 *   After stage 09-gen-catmeta:
 *     context.categoryTree: resolved parent→children tree structure
 */

import path from 'path';
import { fileURLToPath } from 'url';

import discover from './stages/01-discover.js';
import parse from './stages/02-parse.js';
import validate from './stages/03-validate.js';
import diff from './stages/04-diff.js';
import genPacks from './stages/05-gen-packs.js';
import genSearch from './stages/06-gen-search.js';
import genManifest from './stages/07-gen-manifest.js';
import genStats from './stages/08-gen-stats.js';
import genCatmeta from './stages/09-gen-catmeta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'content');
const GENERATED_DIR = path.join(REPO_ROOT, 'generated');

// ── CLI option parsing ────────────────────────────────────────────────────────

/**
 * parseOptions — reads process.argv for known flags.
 * @returns {{ validateOnly: boolean }}
 */
function parseOptions() {
  const args = process.argv.slice(2);
  return {
    // --validate-only: run stages 01–03 only; skip all generation stages.
    // Used by CI on content PRs (CONTRIBUTING.md §4) and for local pre-flight checks.
    validateOnly: args.includes('--validate-only'),
  };
}

// ── Stage runner ──────────────────────────────────────────────────────────────

/**
 * runStage — executes a single pipeline stage, timing it and surfacing errors.
 *
 * Any thrown error or rejection halts the pipeline immediately — the caller
 * receives the error and exits non-zero. This prevents any partially-valid state
 * from reaching generation stages (ARCHITECTURE.md §2).
 *
 * @param {string} name - Human-readable stage name (for logging).
 * @param {Function} stageFn - The stage's default export.
 * @param {object} context - The shared mutable pipeline context.
 * @param {object} options - Parsed CLI options.
 */
async function runStage(name, stageFn, context, options) {
  const start = Date.now();
  process.stdout.write(`  [${name}] running...`);
  try {
    await stageFn(context, options);
    const elapsed = Date.now() - start;
    process.stdout.write(` ✓ (${elapsed}ms)\n`);
  } catch (err) {
    process.stdout.write(` ✗\n`);
    // Re-throw with stage attribution so the top-level handler can log it cleanly.
    err.stage = name;
    throw err;
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

async function main() {
  const options = parseOptions();

  console.log('CommandAtlas — content pipeline');
  console.log(`  mode: ${options.validateOnly ? 'validate-only' : 'full build'}`);
  console.log(`  content dir: ${CONTENT_DIR}`);
  console.log(`  generated dir: ${GENERATED_DIR}`);
  console.log('');

  // The shared context object. Stages add keys as documented above.
  // Pass paths explicitly so stages don't need to re-derive them from __dirname.
  const context = {
    contentDir: CONTENT_DIR,
    generatedDir: GENERATED_DIR,
  };

  const allStart = Date.now();

  try {
    // ── Stages 01–03: always run (validate-only and full build) ──────────────
    await runStage('01-discover', discover, context, options);
    await runStage('02-parse', parse, context, options);
    await runStage('03-validate', validate, context, options);

    if (options.validateOnly) {
      const elapsed = Date.now() - allStart;
      console.log(
        `\nValidation passed — ${elapsed}ms total. (Generation skipped in validate-only mode.)`
      );
      process.exit(0);
    }

    // ── Stages 04–09: generation stages, full build only ─────────────────────
    await runStage('04-diff', diff, context, options);
    await runStage('05-gen-packs', genPacks, context, options);
    await runStage('06-gen-search', genSearch, context, options);
    await runStage('07-gen-manifest', genManifest, context, options);
    await runStage('08-gen-stats', genStats, context, options);
    await runStage('09-gen-catmeta', genCatmeta, context, options);

    const elapsed = Date.now() - allStart;
    console.log(`\nBuild complete — ${elapsed}ms total.`);
    console.log(`  Commands: ${context.stats?.totalCommands ?? '?'}`);
    console.log(`  Workflows: ${context.stats?.totalWorkflows ?? '?'}`);
    console.log(`  Categories: ${context.stats?.totalCategories ?? '?'}`);
  } catch (err) {
    // Print a clean, file-attributed error message — no raw stack trace for
    // validation errors (those are user-facing). Stack traces only for unexpected throws.
    console.error('');
    if (err.stage) {
      console.error(`Pipeline halted at stage [${err.stage}]:`);
    }
    if (err.isValidationError) {
      // Validation errors carry structured data; each entry has file + message.
      console.error('Content validation failed:\n');
      for (const failure of err.failures) {
        console.error(`  ${failure.file}`);
        console.error(`    ✗ ${failure.rule}: ${failure.message}`);
        if (failure.hint) {
          console.error(`      hint: ${failure.hint}`);
        }
        console.error('');
      }
    } else {
      console.error(err.message);
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
