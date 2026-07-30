import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

test('Link-Graph Traversal — Full Corpus Cross-Link Audit', async () => {
  const generatedDir = path.resolve(process.cwd(), 'generated', 'packs', 'commands');
  const files = await fs.readdir(generatedDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const allCommands = new Map();
  const allCategories = new Set();

  for (const file of jsonFiles) {
    const content = JSON.parse(await fs.readFile(path.join(generatedDir, file), 'utf-8'));
    for (const cat of content.categories || []) {
      allCategories.add(cat.slug);
    }
    for (const cmd of content.commands || []) {
      allCommands.set(cmd.slug, cmd);
    }
  }

  assert.ok(allCommands.size > 0, 'Corpus should contain commands');

  const deadLinks = [];

  for (const [slug, cmd] of allCommands) {
    const fm = cmd.frontmatter || {};

    // Check category link
    if (fm.category) {
      const topCat = fm.category.split('/')[0];
      if (!allCategories.has(topCat)) {
        deadLinks.push({ from: slug, field: 'category', target: topCat });
      }
    }

    // Check relatedCommands links
    for (const rel of fm.relatedCommands || []) {
      if (!allCommands.has(rel)) {
        deadLinks.push({ from: slug, field: 'relatedCommands', target: rel });
      }
    }

    // Check alternatives links
    for (const alt of fm.alternatives || []) {
      if (!allCommands.has(alt)) {
        deadLinks.push({ from: slug, field: 'alternatives', target: alt });
      }
    }
  }

  assert.equal(
    deadLinks.length,
    0,
    `Found dead cross-links: ${JSON.stringify(deadLinks, null, 2)}`
  );
});
