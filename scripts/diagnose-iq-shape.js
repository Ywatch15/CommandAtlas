import fs from 'fs';
import path from 'path';

// Replicate the exact parseBodySections logic from lib/markdown.js
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
    const content = normalizedBody.substring(start, end).trim();
    sections[indices[i].title] = content;
  }
  return sections;
}

function parseFrontmatterAndBody(rawMd) {
  const lines = rawMd.split('\n');
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }
  const body = lines
    .slice(closingIndex + 1)
    .join('\n')
    .trimStart();
  return body;
}

const targets = [
  'content/commands/bash/bg.md',
  'content/commands/bash/bind.md',
  'content/commands/cloud-cli/aws.md',
  'content/commands/docker/docker-run.md',
  'content/commands/networking/ping.md',
];

for (const rel of targets) {
  const filePath = path.join(process.cwd(), rel);
  if (!fs.existsSync(filePath)) {
    console.log(`NOT FOUND: ${rel}`);
    continue;
  }
  const rawMd = fs.readFileSync(filePath, 'utf8');
  const body = parseFrontmatterAndBody(rawMd);
  const sections = parseBodySections(body);
  const iq = sections['Interview Questions'] || '';
  const pp = sections['Practice Problems'] || '';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`FILE: ${rel}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\n--- RAW INTERVIEW QUESTIONS SECTION (first 800 chars) ---`);
  console.log(iq.slice(0, 800));
  console.log(`\n--- RAW PRACTICE PROBLEMS SECTION (first 500 chars) ---`);
  console.log(pp.slice(0, 500));
  console.log(`\n--- STRUCTURAL MARKERS ---`);
  console.log(`  IQ starts with bold Q: ${/^\*\*Q:?\*\*/.test(iq.trim())}`);
  console.log(`  IQ starts with bold Q (para): ${/^\*\*Q[: ]/.test(iq.trim())}`);
  console.log(`  IQ has newline between Q/A pairs: ${/\n\n\*\*Q/.test(iq)}`);
  console.log(`  IQ has inline Q/A (no blank line): ${/\*\*A:?\*\*.*\n\*\*Q/m.test(iq)}`);
  console.log(`  PP starts with bold Problem: ${/^\*\*Problem:?\*\*/.test(pp.trim())}`);
  console.log(`  PP has newline between pairs: ${/\n\n\*\*Problem/.test(pp)}`);
}
