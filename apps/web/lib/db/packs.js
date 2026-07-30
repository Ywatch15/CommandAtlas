import { db } from './index.js';

const CHUNK_SIZE = 200;

/**
 * Verifies the checksum of a string using SHA-256.
 * @param {string} text
 * @param {string} expectedChecksum
 * @returns {Promise<boolean>}
 */
async function verifyChecksum(text, expectedChecksum) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedChecksum;
}

/**
 * Fetches the latest manifest.
 * @returns {Promise<object>}
 */
export async function fetchManifest() {
  const res = await fetch('/manifests/latest.json');
  if (!res.ok) throw new Error('Failed to fetch manifest');
  return res.json();
}

/**
 * Returns the list of installed packs from IndexedDB.
 * @returns {Promise<Array<{packId: string, version: number, installedAt: string}>>}
 */
export async function getInstalledPacks() {
  return db.packs.toArray();
}

/**
 * Downloads a content pack, validates its checksum, and writes it to IndexedDB
 * in chunked transactions with progress callback.
 *
 * ARCHITECTURE.md §5: chunked into multiple smaller IndexedDB transactions
 * rather than one all-or-nothing transaction per pack.
 *
 * @param {string} packId
 * @param {object} [options]
 * @param {function} [options.onProgress] - (completed, total) => void
 * @returns {Promise<void>}
 */
export async function downloadAndInstallPack(packId, options = {}) {
  const { onProgress } = options;

  // 1. Fetch manifest
  const manifest = await fetchManifest();
  const packMeta = manifest.packs.find((p) => p.packId === packId);
  if (!packMeta) {
    throw new Error(`Pack ${packId} not found in manifest`);
  }

  // 2. Check if already installed at this version
  const existing = await db.packs.get(packId);
  if (existing && existing.version === packMeta.version) {
    return; // Already up to date
  }

  // 3. Fetch pack JSON
  const packRes = await fetch(packMeta.url);
  if (!packRes.ok) {
    throw new Error(`Failed to fetch pack at ${packMeta.url}`);
  }
  const packText = await packRes.text();

  // 4. Verify SHA-256 checksum
  const isValid = await verifyChecksum(packText, packMeta.checksum);
  if (!isValid) {
    throw new Error(`Integrity check failed for pack ${packId}`);
  }

  const packData = JSON.parse(packText);

  // 5. Collect all records to write
  const allRecords = [];
  for (const cmd of packData.commands || []) {
    allRecords.push({ store: 'commands', data: cmd });
  }
  for (const wf of packData.workflows || []) {
    allRecords.push({ store: 'workflows', data: wf });
  }
  for (const cat of packData.categories || []) {
    allRecords.push({ store: 'categories', data: cat });
  }

  const total = allRecords.length;
  let completed = 0;

  // 6. Write in chunked transactions
  for (let i = 0; i < allRecords.length; i += CHUNK_SIZE) {
    const chunk = allRecords.slice(i, i + CHUNK_SIZE);

    // Group by store for this chunk
    const byStore = { commands: [], workflows: [], categories: [] };
    for (const rec of chunk) {
      byStore[rec.store].push(rec.data);
    }

    await db.transaction('rw', [db.commands, db.workflows, db.categories], async () => {
      for (const cmd of byStore.commands) await db.commands.put(cmd);
      for (const wf of byStore.workflows) await db.workflows.put(wf);
      for (const cat of byStore.categories) await db.categories.put(cat);
    });

    completed += chunk.length;
    if (onProgress) onProgress(completed, total);
  }

  // 7. Record pack installation
  await db.packs.put({
    packId,
    version: packMeta.version,
    installedAt: new Date().toISOString(),
  });

  if (onProgress) onProgress(total, total);
}

/**
 * Removes a pack's content from IndexedDB.
 * @param {string} packId
 * @returns {Promise<void>}
 */
export async function removePack(packId) {
  // Remove commands belonging to this pack
  const commands = await db.commands.where('category').startsWith(packId).toArray();
  const commandSlugs = commands.map((c) => c.slug);

  // Remove in chunks
  for (let i = 0; i < commandSlugs.length; i += CHUNK_SIZE) {
    const batch = commandSlugs.slice(i, i + CHUNK_SIZE);
    await db.commands.bulkDelete(batch);
  }

  // Remove category
  await db.categories.delete(packId);

  // Remove pack record
  await db.packs.delete(packId);
}

/**
 * Checks the manifest for available updates vs installed packs.
 * @returns {Promise<Array<{packId: string, availableVersion: number, installedVersion: number|null, isInstalled: boolean, isUpdateAvailable: boolean}>>}
 */
export async function getPackStatus() {
  const manifest = await fetchManifest();
  const installed = await getInstalledPacks();
  const installedMap = new Map(installed.map((p) => [p.packId, p]));

  return manifest.packs.map((p) => {
    const inst = installedMap.get(p.packId);
    return {
      packId: p.packId,
      availableVersion: p.version,
      installedVersion: inst ? inst.version : null,
      isInstalled: !!inst,
      isUpdateAvailable: inst ? inst.version < p.version : false,
      size: p.size || 0,
    };
  });
}
