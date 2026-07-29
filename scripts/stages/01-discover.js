/**
 * 01-discover.js — Stage 01: Discover content files.
 *
 * ARCHITECTURE.md §2: "01-discover → walk content/, classify files"
 *
 * Input:  context.contentDir (string path to content/)
 * Output: context.files — Array<DiscoveredFile>
 *
 * DiscoveredFile {
 *   path:   string  — absolute path to the .md file
 *   type:   'command' | 'workflow' | 'category'
 *   slug:   string  — derived from filename (without .md extension)
 *   folder: string  — subfolder under content/commands/ (e.g. 'linux', 'git'),
 *                     or null for workflows/categories
 * }
 *
 * Design notes:
 * - Uses Node's fs.readdir with recursive:true (Node 20+) to walk the tree.
 *   No third-party dependency needed for a simple glob walk.
 * - Classification is purely by path: content/commands/** = command,
 *   content/workflows/* = workflow, content/categories/* = category.
 *   No file content is read here — that is stage 02's responsibility.
 * - Non-.md files are silently skipped (e.g. .gitkeep).
 * - Files in unexpected sub-paths (e.g. content/commands/linux/nested/foo.md)
 *   are reported as an error, not silently skipped, because the folder rules
 *   (CONTENT_GUIDELINES.md §3) are mechanically enforced.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * @param {object} context
 * @param {string} context.contentDir
 * @param {object} _options
 */
export default async function discover(context, _options) {
  const { contentDir } = context;

  const commandsDir = path.join(contentDir, 'commands');
  const workflowsDir = path.join(contentDir, 'workflows');
  const categoriesDir = path.join(contentDir, 'categories');

  const files = [];
  const errors = [];

  // ── Discover commands ──────────────────────────────────────────────────────
  // Expected structure: content/commands/<topic-folder>/<slug>.md
  // One level of nesting only (CONTENT_GUIDELINES.md §3).
  const commandEntries = await safeReadDir(commandsDir);
  for (const topicFolder of commandEntries) {
    const topicPath = path.join(commandsDir, topicFolder);
    const stat = await fs.stat(topicPath);
    if (!stat.isDirectory()) {
      // Non-directory entries at the topic level are unexpected
      if (topicFolder !== '.gitkeep') {
        errors.push({
          file: topicPath,
          rule: 'folder-structure',
          message: `Expected a topic folder, found a file directly under content/commands/.`,
          hint: 'Commands must live in content/commands/<topic>/<slug>.md — never directly under content/commands/.',
        });
      }
      continue;
    }

    const commandFiles = await safeReadDir(topicPath);
    for (const filename of commandFiles) {
      if (filename === '.gitkeep') continue;
      if (!filename.endsWith('.md')) continue;

      const filePath = path.join(topicPath, filename);
      // Check for unexpected nesting (content/commands/<topic>/<subdir>/...)
      const fileStat = await fs.stat(filePath);
      if (fileStat.isDirectory()) {
        errors.push({
          file: filePath,
          rule: 'folder-structure',
          message: `Unexpected nested directory inside topic folder '${topicFolder}'.`,
          hint: 'Commands must not be nested more than one level below their topic folder.',
        });
        continue;
      }

      const slug = filename.replace(/\.md$/, '');
      files.push({ path: filePath, type: 'command', slug, folder: topicFolder });
    }
  }

  // ── Discover workflows ─────────────────────────────────────────────────────
  // Expected structure: content/workflows/<slug>.md — flat, never sub-foldered.
  const workflowFiles = await safeReadDir(workflowsDir);
  for (const filename of workflowFiles) {
    if (filename === '.gitkeep') continue;
    if (!filename.endsWith('.md')) continue;

    const filePath = path.join(workflowsDir, filename);
    const fileStat = await fs.stat(filePath);
    if (fileStat.isDirectory()) {
      errors.push({
        file: filePath,
        rule: 'folder-structure',
        message: `Workflows must be flat under content/workflows/ — no sub-folders allowed.`,
        hint: 'CONTENT_GUIDELINES.md §3: workflows are inherently cross-topic and never sub-foldered.',
      });
      continue;
    }

    const slug = filename.replace(/\.md$/, '');
    files.push({ path: filePath, type: 'workflow', slug, folder: null });
  }

  // ── Discover categories ────────────────────────────────────────────────────
  // Expected structure: content/categories/<slug>.md — flat.
  const categoryFiles = await safeReadDir(categoriesDir);
  for (const filename of categoryFiles) {
    if (filename === '.gitkeep') continue;
    if (!filename.endsWith('.md')) continue;

    const filePath = path.join(categoriesDir, filename);
    const slug = filename.replace(/\.md$/, '');
    files.push({ path: filePath, type: 'category', slug, folder: null });
  }

  // ── Surface folder-structure errors now (before parse) ────────────────────
  if (errors.length > 0) {
    const err = new Error('Folder structure errors found during discovery.');
    err.isValidationError = true;
    err.failures = errors;
    throw err;
  }

  context.files = files;

  // Log discovery summary for transparency (suppressed in validate-only mode
  // to keep CI output clean; always shown in full build mode).
  const commandCount = files.filter((f) => f.type === 'command').length;
  const workflowCount = files.filter((f) => f.type === 'workflow').length;
  const categoryCount = files.filter((f) => f.type === 'category').length;

  // Using process.stdout directly so the main orchestrator's inline "✓" suffix
  // isn't broken by a premature newline from console.log.
  process.stdout.write(
    ` → ${commandCount} command(s), ${workflowCount} workflow(s), ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`
  );
}

/**
 * safeReadDir — reads a directory, returning [] if it doesn't exist.
 * Avoids crashing the pipeline when an optional directory (e.g. workflows/)
 * hasn't been created yet during early development.
 *
 * @param {string} dirPath
 * @returns {Promise<string[]>}
 */
async function safeReadDir(dirPath) {
  try {
    return await fs.readdir(dirPath);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
