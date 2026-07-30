import { db } from './index.js';
import { downloadAndInstallPack, fetchManifest, getInstalledPacks } from './packs.js';

/**
 * Checks for content updates on launch and applies only the diff.
 * ARCHITECTURE.md §7: client compares meta.lastSyncedVersion against latest
 * manifest and downloads only the diff.
 *
 * @param {object} [options]
 * @param {function} [options.onProgress] - (packId, completed, total) => void
 * @returns {Promise<{updated: boolean, updatedPacks: string[]}>}
 */
export async function syncContentUpdates(options = {}) {
  const { onProgress } = options;

  let manifest;
  try {
    manifest = await fetchManifest();
  } catch {
    // Offline or manifest unavailable — skip sync
    return { updated: false, updatedPacks: [] };
  }

  // Read local version
  const meta = await db.meta.get('lastSyncedVersion');
  const localVersion = meta ? meta.value : 0;
  const remoteVersion = manifest.version;

  if (localVersion >= remoteVersion) {
    return { updated: false, updatedPacks: [] };
  }

  // Check which installed packs need updating
  const installed = await getInstalledPacks();
  const installedMap = new Map(installed.map((p) => [p.packId, p]));
  const updatedPacks = [];

  for (const packEntry of manifest.packs) {
    const inst = installedMap.get(packEntry.packId);
    if (inst && inst.version < packEntry.version) {
      // This installed pack has an update — re-download it
      await downloadAndInstallPack(packEntry.packId, {
        onProgress: onProgress
          ? (completed, total) => onProgress(packEntry.packId, completed, total)
          : undefined,
      });
      updatedPacks.push(packEntry.packId);
    }
  }

  // Update local version
  await db.meta.put({ key: 'lastSyncedVersion', value: remoteVersion });

  return { updated: updatedPacks.length > 0, updatedPacks };
}
