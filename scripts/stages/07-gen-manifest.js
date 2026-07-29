import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export default async function genManifest(context, _options) {
  const manifestsDir = path.join(context.generatedDir, 'manifests');
  await fs.mkdir(manifestsDir, { recursive: true });

  const packs = [];

  if (context.packs) {
    for (const [packId, packData] of context.packs.entries()) {
      const packText = JSON.stringify(packData, null, 2);
      const checksum = crypto.createHash('sha256').update(packText).digest('hex');
      const size = Buffer.byteLength(packText, 'utf-8');

      packs.push({
        packId,
        version: '1',
        size,
        checksum,
        url: `/packs/commands/${packId}.json`,
      });
    }
  }

  const manifest = {
    version: '1',
    generatedAt: new Date().toISOString(),
    packs,
  };

  await fs.writeFile(
    path.join(manifestsDir, 'latest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  context.manifest = manifest;
  process.stdout.write(` → manifest written with checksums`);
}
