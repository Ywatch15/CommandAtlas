import fs from 'fs';
import path from 'path';

function getMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) getMdFiles(filePath, fileList);
    else if (file.endsWith('.md')) fileList.push(filePath);
  }
  return fileList;
}

function parseBodySections(body) {
  if (!body) return {};
  const normalizedBody = body.replace(/\r\n/g, '\n');
  const sections = {};
  const regex = /^##\s+(.+)$/gm;
  let match;
  const indices = [];
  while ((match = regex.exec(normalizedBody)) !== null) {
    indices.push({ title: match[1].trim(), index: match.index, headerLength: match[0].length });
  }
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index + indices[i].headerLength;
    const end = i < indices.length - 1 ? indices[i + 1].index : normalizedBody.length;
    sections[indices[i].title] = normalizedBody.substring(start, end).trim();
  }
  return sections;
}

function getBody(rawMd) {
  const lines = rawMd.split('\n');
  let ci = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      ci = i;
      break;
    }
  }
  return lines
    .slice(ci + 1)
    .join('\n')
    .trimStart();
}

const mdFiles = getMdFiles(path.join(process.cwd(), 'content', 'commands'));

let blankLineSep = 0; // bg.md style: blank line between Q/A pairs
let noBlankLineSep = 0; // bind.md style: no blank line, Q/A run together
let mixed = 0;
let noIQ = 0;

const noBlankFiles = [];
const blankFiles = [];

for (const file of mdFiles) {
  const rawMd = fs.readFileSync(file, 'utf8');
  const body = getBody(rawMd);
  const sections = parseBodySections(body);
  const iq = sections['Interview Questions'] || '';
  if (!iq.trim() || iq.includes('Not applicable')) {
    noIQ++;
    continue;
  }

  const hasBlankSep = /\n\n\*\*Q/.test(iq);
  const hasInlineSep = /\*\*A:?\*\*.*\n\*\*Q/m.test(iq);

  if (hasBlankSep && !hasInlineSep) {
    blankLineSep++;
    blankFiles.push(path.relative(process.cwd(), file));
  } else if (hasInlineSep && !hasBlankSep) {
    noBlankLineSep++;
    noBlankFiles.push(path.relative(process.cwd(), file));
  } else if (hasBlankSep && hasInlineSep) {
    mixed++;
  } else {
    // Single Q/A pair or undetectable
    blankLineSep++; // default bucket
  }
}

console.log(`Total MD files: ${mdFiles.length}`);
console.log(`No IQ section / N/A: ${noIQ}`);
console.log(`Blank-line separated (bg.md style): ${blankLineSep}`);
console.log(`No-blank-line / inline (bind.md style): ${noBlankLineSep}`);
console.log(`Mixed: ${mixed}`);
console.log(`\nFirst 20 no-blank-line files:`);
noBlankFiles.slice(0, 20).forEach((f) => console.log(`  ${f}`));
console.log(`\nFirst 10 blank-line files:`);
blankFiles.slice(0, 10).forEach((f) => console.log(`  ${f}`));
