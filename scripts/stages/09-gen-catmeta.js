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
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * @param {object} context
 * @param {object} _options
 */
export default async function genCatmeta(context, _options) {
  const categoriesPackDir = path.join(context.generatedDir, 'packs', 'categories');
  await fs.mkdir(categoriesPackDir, { recursive: true });

  const categoryRecords = (context.records || []).filter((r) => r.type === 'category');
  const commandRecords = (context.records || []).filter((r) => r.type === 'command');

  // Count commands per category
  const commandCounts = {};
  for (const cmd of commandRecords) {
    const cat = cmd.frontmatter?.category;
    if (cat) {
      commandCounts[cat] = (commandCounts[cat] || 0) + 1;
      const topLevel = cat.split('/')[0];
      if (topLevel !== cat) {
        commandCounts[topLevel] = (commandCounts[topLevel] || 0) + 1;
      }
    }
  }

  // Create node map
  const categoryMap = new Map();
  for (const cat of categoryRecords) {
    const fm = cat.frontmatter || {};
    const slug = cat.slug;
    categoryMap.set(slug, {
      slug,
      name: fm.name || slug,
      description: fm.description || '',
      parent: fm.parent || null,
      order: typeof fm.order === 'number' ? fm.order : 99,
      commandCount: commandCounts[slug] || 0,
      children: [],
    });
  }

  const roots = [];

  // Assemble hierarchy
  for (const node of categoryMap.values()) {
    if (node.parent && categoryMap.has(node.parent)) {
      categoryMap.get(node.parent).children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Helper to sort tree recursively
  function sortTree(nodes) {
    nodes.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortTree(node.children);
      }
    }
  }

  sortTree(roots);

  const tree = { roots };
  await fs.writeFile(
    path.join(categoriesPackDir, 'category-tree.json'),
    JSON.stringify(tree, null, 2),
    'utf-8'
  );

  context.categoryTree = tree;
  process.stdout.write(` → category tree written (${categoryRecords.length} node(s))`);
}
