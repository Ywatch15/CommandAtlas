/**
 * 09-gen-catmeta.js — Stage 09: Build resolved category tree metadata.
 *
 * ARCHITECTURE.md §2: "09-gen-catmeta → resolved category trees"
 *
 * Input:  context.records (all categories)
 * Output: context.categoryTree — resolved parent→children tree structure
 *         Written to: generated/packs/categories/category-tree.json
 *
 * Category tree schema:
 * [
 *   {
 *     slug:        string,
 *     name:        string,
 *     description: string,
 *     parent:      string | null,
 *     children:    [recursive same shape],
 *     commandCount: number,  // populated from stats
 *     order:       number,
 *   }
 * ]
 *
 * The tree is used by:
 * - The Sidebar component for navigation rendering.
 * - The category browse page.
 * - The search facet system (ARCHITECTURE.md §9).
 *
 * Design notes:
 * - Circular references are already caught by stage 03 (R11), so this stage
 *   can assume a valid DAG.
 * - The tree is derived purely from category records + frontmatter — no
 *   external input.
 *
 * TODO (Milestone 0): implement tree assembly from category records.
 *   Stub writes an empty tree.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * @param {object} context
 * @param {object} _options
 */
export default async function genCatmeta(context, _options) {
  // STUB: write an empty category tree.
  // Full implementation: build parent→children tree from category records,
  // annotate each node with commandCount from context.stats.coverageByTopic.

  const categoriesPackDir = path.join(context.generatedDir, 'packs', 'categories');
  await fs.mkdir(categoriesPackDir, { recursive: true });

  const tree = { _stub: true, roots: [] };
  await fs.writeFile(
    path.join(categoriesPackDir, 'category-tree.json'),
    JSON.stringify(tree, null, 2),
    'utf-8'
  );

  context.categoryTree = tree;
  process.stdout.write(` → category tree written (stub)`);
}
