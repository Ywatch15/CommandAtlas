import fs from 'fs';
import path from 'path';

const commandsDir = path.resolve('content/commands');
const allSlugs = new Set();
const fileMap = new Map();

function scanDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      scanDir(full);
    } else if (file.endsWith('.md')) {
      const c = fs.readFileSync(full, 'utf8');
      const m = c.match(/^slug:\s*(.+)$/m);
      if (m) {
        const slug = m[1].trim();
        allSlugs.add(slug);
        fileMap.set(slug, full);
      }
    }
  });
}
scanDir(commandsDir);

console.log('Total discovered command slugs in corpus:', allSlugs.size);

// Stage 1: Filter out non-existent slugs from relatedCommands and alternatives
fileMap.forEach((file, selfSlug) => {
  let content = fs.readFileSync(file, 'utf8');
  const fmM = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmM) return;
  let fm = fmM[1];

  const sanitizeArr = (rawStr) => {
    if (!rawStr) return [];
    let items = [];
    if (rawStr.trim().startsWith('[')) {
      items = rawStr
        .trim()
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      items = rawStr.split('\n').map((s) =>
        s
          .replace(/^\s*-\s*/, '')
          .trim()
          .replace(/^['"]|['"]$/g, '')
      );
    }
    return items
      .map((s) => s.toLowerCase().replace(/\s+/g, '-'))
      .filter((s) => s && s !== selfSlug && allSlugs.has(s));
  };

  const relM = fm.match(/relatedCommands:\s*(\[[^\]]*\]|(?:\r?\n\s*-[^\n]+)+)/);
  const altM = fm.match(/alternatives:\s*(\[[^\]]*\]|(?:\r?\n\s*-[^\n]+)+)/);

  let rel = relM ? sanitizeArr(relM[1]) : [];
  let alt = altM ? sanitizeArr(altM[1]) : [];

  rel = Array.from(new Set(rel));
  alt = Array.from(new Set(alt));

  if (relM) {
    fm = fm.replace(
      /relatedCommands:\s*(\[[^\]]*\]|(?:\r?\n\s*-[^\n]+)+)/,
      'relatedCommands: [' + rel.join(', ') + ']'
    );
  }
  if (altM) {
    fm = fm.replace(
      /alternatives:\s*(\[[^\]]*\]|(?:\r?\n\s*-[^\n]+)+)/,
      'alternatives: [' + alt.join(', ') + ']'
    );
  }

  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '---\n' + fm.trim() + '\n---');
  fs.writeFileSync(file, content, 'utf8');
});

// Stage 2: Synchronize bidirectional cross-references
allSlugs.forEach((slug) => {
  const file = fileMap.get(slug);
  if (!file || !fs.existsSync(file)) return;
  const c = fs.readFileSync(file, 'utf8');
  const fmM = c.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmM) return;
  const fm = fmM[1];

  const relM = fm.match(/relatedCommands:\s*\[([^\]]*)\]/);
  const altM = fm.match(/alternatives:\s*\[([^\]]*)\]/);
  const rels = relM && relM[1].trim() ? relM[1].split(',').map((s) => s.trim()) : [];
  const alts = altM && altM[1].trim() ? altM[1].split(',').map((s) => s.trim()) : [];

  rels.forEach((target) => {
    if (!allSlugs.has(target) || target === slug) return;
    const tf = fileMap.get(target);
    let tc = fs.readFileSync(tf, 'utf8');
    const tfmM = tc.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!tfmM) return;
    let tfm = tfmM[1];
    const trelM = tfm.match(/relatedCommands:\s*\[([^\]]*)\]/);
    const trels = trelM && trelM[1].trim() ? trelM[1].split(',').map((s) => s.trim()) : [];
    if (!trels.includes(slug)) {
      trels.push(slug);
      tfm = tfm.replace(
        /relatedCommands:\s*\[([^\]]*)\]/,
        'relatedCommands: [' + trels.join(', ') + ']'
      );
      tc = tc.replace(/^---\r?\n[\s\S]*?\r?\n---/, '---\n' + tfm + '\n---');
      fs.writeFileSync(tf, tc, 'utf8');
    }
  });

  alts.forEach((target) => {
    if (!allSlugs.has(target) || target === slug) return;
    const tf = fileMap.get(target);
    let tc = fs.readFileSync(tf, 'utf8');
    const tfmM = tc.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!tfmM) return;
    let tfm = tfmM[1];
    const taltM = tfm.match(/alternatives:\s*\[([^\]]*)\]/);
    const talts = taltM && taltM[1].trim() ? taltM[1].split(',').map((s) => s.trim()) : [];
    if (!talts.includes(slug)) {
      talts.push(slug);
      tfm = tfm.replace(/alternatives:\s*\[([^\]]*)\]/, 'alternatives: [' + talts.join(', ') + ']');
      tc = tc.replace(/^---\r?\n[\s\S]*?\r?\n---/, '---\n' + tfm + '\n---');
      fs.writeFileSync(tf, tc, 'utf8');
    }
  });
});

console.log('Sanitized and synchronized cross-references successfully across entire corpus.');
