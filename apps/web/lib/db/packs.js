import { db } from './index.js';

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
 * Downloads a content pack, validates its checksum, and writes it to IndexedDB.
 * @param {string} packId
 * @returns {Promise<void>}
 */
export async function downloadAndInstallPack(packId) {
  // 1. Fetch latest.json manifest to get the pack metadata (checksum, url, etc)
  const manifestRes = await fetch('/manifests/latest.json');
  if (!manifestRes.ok) {
    throw new Error('Failed to fetch manifest latest.json');
  }
  const manifest = await manifestRes.json();
  const packMeta = manifest.packs.find((p) => p.packId === packId);
  if (!packMeta) {
    throw new Error(`Pack ${packId} not found in manifest`);
  }

  // 2. Fetch the pack JSON
  const packRes = await fetch(packMeta.url);
  if (!packRes.ok) {
    throw new Error(`Failed to fetch pack at ${packMeta.url}`);
  }
  const packText = await packRes.text();

  // 3. Verify SHA-256 checksum
  const isValid = await verifyChecksum(packText, packMeta.checksum);
  if (!isValid) {
    throw new Error(`Integrity check failed for pack ${packId}`);
  }

  const packData = JSON.parse(packText);

  // 4. Write to IndexedDB in one Dexie transaction
  await db.transaction('rw', [db.commands, db.workflows, db.categories, db.packs], async () => {
    // Put commands
    if (packData.commands && Array.isArray(packData.commands)) {
      for (const cmd of packData.commands) {
        await db.commands.put(cmd);
      }
    }
    // Put workflows
    if (packData.workflows && Array.isArray(packData.workflows)) {
      for (const wf of packData.workflows) {
        await db.workflows.put(wf);
      }
    }
    // Put categories
    if (packData.categories && Array.isArray(packData.categories)) {
      for (const cat of packData.categories) {
        await db.categories.put(cat);
      }
    }
    // Record pack installation
    await db.packs.put({
      packId,
      version: packMeta.version,
      installedAt: new Date().toISOString(),
    });
  });
}
