import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export default async function genManifest(context, _options) {
  const manifestsDir = path.join(context.generatedDir, 'manifests');
  await fs.mkdir(manifestsDir, { recursive: true });

  // Compute a global content version from the max of all record versions
  let globalVersion = 1;
  for (const record of context.records) {
    if (record.contentVersion && record.contentVersion > globalVersion) {
      globalVersion = record.contentVersion;
    }
  }

  const packs = [];

  if (context.packs) {
    for (const [packId, packData] of context.packs.entries()) {
      const packText = JSON.stringify(packData, null, 2);
      const checksum = crypto.createHash('sha256').update(packText).digest('hex');
      const size = Buffer.byteLength(packText, 'utf-8');

      // Per-pack version: max contentVersion among its records
      let packVersion = 1;
      for (const cmd of packData.commands || []) {
        if (cmd.contentVersion > packVersion) packVersion = cmd.contentVersion;
      }
      for (const wf of packData.workflows || []) {
        if (wf.contentVersion > packVersion) packVersion = wf.contentVersion;
      }

      packs.push({
        packId,
        version: packVersion,
        size,
        checksum,
        url: `/packs/commands/${packId}.json`,
      });
    }
  }

  const manifest = {
    version: globalVersion,
    generatedAt: new Date().toISOString(),
    packs,
  };

  await fs.writeFile(
    path.join(manifestsDir, 'latest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // Generate diff manifest if context.diff is available
  if (context.diff) {
    const { added, modified, removed } = context.diff;
    const hasDiff = added.length > 0 || modified.length > 0 || removed.length > 0;

    if (hasDiff) {
      const diffManifest = {
        fromVersion: globalVersion - 1,
        toVersion: globalVersion,
        generatedAt: new Date().toISOString(),
        added,
        modified,
        removed,
        // Include affected pack IDs so client knows which packs to re-fetch
        affectedPacks: [],
      };

      // Determine affected packs
      const affectedPackSet = new Set();
      for (const record of context.records) {
        if (added.includes(record.slug) || modified.includes(record.slug)) {
          const topLevel = (record.frontmatter?.category || '').split('/')[0];
          if (topLevel) affectedPackSet.add(topLevel);
        }
      }
      diffManifest.affectedPacks = Array.from(affectedPackSet);

      await fs.writeFile(
        path.join(manifestsDir, `diff-${globalVersion}.json`),
        JSON.stringify(diffManifest, null, 2),
        'utf-8'
      );
    }
  }

  context.manifest = manifest;
  process.stdout.write(` → manifest written with checksums`);
}
