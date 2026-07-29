/**
 * 04-diff.js — Stage 04: Compute content diff vs. last published manifest.
 *
 * ARCHITECTURE.md §2: "04-diff → compare vs. last manifest"
 * ARCHITECTURE.md §7: "Content version — derived from Git history by the build
 *   pipeline's diff stage, tracked per-pack and globally."
 *
 * Input:  context.records (validated, from stage 03)
 *         context.generatedDir (path to generated/)
 * Output: context.diff   — { added: string[], modified: string[], removed: string[] }
 *                            where each entry is a slug
 *         context.records — same array, each record now has .contentVersion resolved
 *                            (read from frontmatter if present, otherwise derived
 *                            from Git log count for that file)
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * @param {object} context
 * @param {Array}  context.records
 * @param {string} context.generatedDir
 * @param {object} _options
 */
export default async function diff(context, _options) {
  const latestPath = path.join(context.generatedDir, 'manifests', 'latest.json');
  const previousSlugs = new Map(); // slug -> contentVersion

  try {
    const latestJson = await fs.readFile(latestPath, 'utf-8');
    const latest = JSON.parse(latestJson);
    for (const pack of latest.packs || []) {
      // pack.url is like "/packs/commands/linux.json", resolve relative to generatedDir
      const relativeUrl = pack.url.startsWith('/') ? pack.url.slice(1) : pack.url;
      const packPath = path.join(context.generatedDir, relativeUrl);
      try {
        const packJson = await fs.readFile(packPath, 'utf-8');
        const packData = JSON.parse(packJson);
        for (const cmd of packData.commands || []) {
          previousSlugs.set(cmd.slug, cmd.contentVersion);
        }
        for (const wf of packData.workflows || []) {
          previousSlugs.set(wf.slug, wf.contentVersion);
        }
      } catch {
        // Ignored
      }
    }
  } catch {
    // Ignored (latest.json doesn't exist yet)
  }

  const added = [];
  const modified = [];

  for (const record of context.records) {
    if (record.type === 'category') continue; // categories are not versioned individually

    // Resolve contentVersion from Git history
    const relativePath = path.relative(process.cwd(), record.path);
    let commitCount = 1;
    try {
      const { stdout } = await execAsync(`git log --follow --oneline -- "${relativePath}"`);
      const lines = stdout
        .trim()
        .split('\n')
        .filter((l) => l.length > 0);
      commitCount = lines.length > 0 ? lines.length : 1;
    } catch {
      commitCount = 1;
    }

    record.contentVersion = commitCount;

    if (previousSlugs.has(record.slug)) {
      const prevVersion = previousSlugs.get(record.slug);
      if (record.contentVersion !== prevVersion) {
        modified.push(record.slug);
      }
      previousSlugs.delete(record.slug);
    } else {
      added.push(record.slug);
    }
  }

  // Any remaining slugs in previousSlugs were removed
  const removed = Array.from(previousSlugs.keys());

  context.diff = { added, modified, removed };

  process.stdout.write(
    ` → diff calculated (${added.length} added, ${modified.length} modified, ${removed.length} removed)`
  );
}
