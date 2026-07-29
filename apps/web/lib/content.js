import fs from 'fs/promises';
import path from 'path';

// Both SSG and IndexedDB derive from generated/packs/*.json (ARCHITECTURE.md §3)
const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const PACKS_DIR = path.join(PROJECT_ROOT, 'generated', 'packs', 'commands');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'generated', 'manifests', 'latest.json');

async function loadAllPacks() {
  try {
    const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf-8'));
    const packs = [];
    for (const entry of manifest.packs) {
      const packPath = path.join(PACKS_DIR, `${entry.packId}.json`);
      const packData = JSON.parse(await fs.readFile(packPath, 'utf-8'));
      packs.push(packData);
    }
    return packs;
  } catch {
    return [];
  }
}

export async function getAllCommands() {
  const packs = await loadAllPacks();
  const commands = [];
  for (const pack of packs) {
    for (const cmd of pack.commands || []) {
      commands.push(cmd);
    }
  }
  return commands;
}

export async function getCommandBySlug(slug) {
  const commands = await getAllCommands();
  return commands.find((c) => c.slug === slug) || null;
}

export async function getAllCategories() {
  const packs = await loadAllPacks();
  const categories = [];
  const seen = new Set();
  for (const pack of packs) {
    for (const cat of pack.categories || []) {
      if (!seen.has(cat.slug)) {
        seen.add(cat.slug);
        categories.push(cat);
      }
    }
  }
  return categories;
}

export async function getCategoryBySlug(slug) {
  const categories = await getAllCategories();
  return categories.find((c) => c.slug === slug) || null;
}
