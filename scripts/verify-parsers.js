import fs from 'fs';
import path from 'path';

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

function parseInterviewQuestions(sectionMarkdown) {
  if (!sectionMarkdown || !sectionMarkdown.trim()) return [];
  const text = sectionMarkdown.replace(/\r\n/g, '\n').trim();
  const qBlocks = text.split(/(?=[*][*]Q:)/);
  const pairs = [];
  for (const block of qBlocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('**Q:')) continue;
    const aParts = trimmed.split(/[*][*]A:?[*][*]\s*/);
    let question = (aParts[0] || '').trim();
    const answer = (aParts.slice(1).join('\n') || '').trim();
    question = question
      .replace(/^[*][*]Q:[*][*]\s*/, '')
      .replace(/^[*][*]Q:\s*/, '')
      .replace(/[*][*]\s*$/, '')
      .trim();
    if (question) pairs.push({ question, answer });
  }
  return pairs;
}

function parsePracticeProblems(sectionMarkdown) {
  if (!sectionMarkdown || !sectionMarkdown.trim()) return [];
  const text = sectionMarkdown.replace(/\r\n/g, '\n').trim();
  const pBlocks = text.split(/(?=[*][*]Problem)/);
  const items = [];
  for (const block of pBlocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('**Problem')) continue;
    let problem = trimmed;
    let hint = '';
    let solution = '';
    const solSplit = problem.split(/[*][*]Solution:?[*][*]\s*/);
    if (solSplit.length > 1) {
      problem = solSplit[0];
      solution = solSplit.slice(1).join('');
    }
    const hintSplit = problem.split(/[*][*]Hint:?[*][*]\s*/);
    if (hintSplit.length > 1) {
      problem = hintSplit[0];
      hint = hintSplit.slice(1).join('');
    }
    problem = problem.replace(/^[*][*]Problem:?[*][*]\s*/, '').trim();
    hint = hint.trim();
    solution = solution.trim();
    if (problem) items.push({ problem, hint, solution });
  }
  return items;
}

function getMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) getMdFiles(filePath, fileList);
    else if (file.endsWith('.md')) fileList.push(filePath);
  }
  return fileList;
}

// Test specific files
const targets = [
  'content/commands/bash/bg.md',
  'content/commands/bash/bind.md',
  'content/commands/cloud-cli/aws-configure.md',
  'content/commands/docker/docker-run.md',
  'content/commands/networking/ping.md',
  'content/commands/permissions/chmod.md',
  'content/commands/processes/kill.md',
  'content/commands/text-processing/awk.md',
];

console.log('=== TARGETED FILE VERIFICATION ===\n');
let allOk = true;

for (const rel of targets) {
  const filePath = path.join(process.cwd(), rel);
  if (!fs.existsSync(filePath)) {
    console.log(`NOT FOUND: ${rel}`);
    continue;
  }
  const rawMd = fs.readFileSync(filePath, 'utf8');
  const body = getBody(rawMd);
  const sections = parseBodySections(body);

  const iqPairs = parseInterviewQuestions(sections['Interview Questions'] || '');
  const ppItems = parsePracticeProblems(sections['Practice Problems'] || '');

  const iqOk = iqPairs.length > 0 && iqPairs.every((p) => p.question && p.answer);
  const ppOk = ppItems.length > 0 && ppItems.every((p) => p.problem);

  if (!iqOk || !ppOk) allOk = false;

  console.log(`${iqOk && ppOk ? '✓' : '✗'} ${rel}`);
  console.log(`    IQ: ${iqPairs.length} pairs ${iqOk ? 'OK' : 'FAIL'}`);
  for (const p of iqPairs) {
    console.log(`      Q: ${p.question.slice(0, 70).replace(/\n/g, ' ')}...`);
    console.log(`      A: ${(p.answer || '(empty)').slice(0, 50).replace(/\n/g, ' ')}...`);
  }
  console.log(`    PP: ${ppItems.length} items ${ppOk ? 'OK' : 'FAIL'}`);
}

// Full corpus sweep
console.log('\n=== FULL CORPUS SWEEP ===\n');
const mdFiles = getMdFiles(path.join(process.cwd(), 'content', 'commands'));
let totalFiles = 0;
const failedFiles = [];
let totalIQ = 0;
let totalPP = 0;
let emptyAnswers = 0;

for (const file of mdFiles) {
  totalFiles++;
  const rawMd = fs.readFileSync(file, 'utf8');
  const body = getBody(rawMd);
  const sections = parseBodySections(body);

  const iqSection = sections['Interview Questions'] || '';
  const ppSection = sections['Practice Problems'] || '';

  if (!iqSection.trim() || iqSection.includes('Not applicable')) continue;

  const iqPairs = parseInterviewQuestions(iqSection);
  const ppItems = parsePracticeProblems(ppSection);

  totalIQ += iqPairs.length;
  totalPP += ppItems.length;

  const emptyA = iqPairs.filter((p) => !p.answer);
  emptyAnswers += emptyA.length;

  if (iqPairs.length === 0) {
    failedFiles.push({ file: path.relative(process.cwd(), file), reason: 'IQ parsed 0 pairs' });
  }

  if (emptyA.length > 0) {
    failedFiles.push({
      file: path.relative(process.cwd(), file),
      reason: `${emptyA.length} empty answer(s)`,
    });
  }
}

console.log(`Total files: ${totalFiles}`);
console.log(`Total IQ pairs extracted: ${totalIQ}`);
console.log(`Total PP items extracted: ${totalPP}`);
console.log(`Empty answers: ${emptyAnswers}`);
console.log(`Failed files: ${failedFiles.length}`);

if (failedFiles.length > 0) {
  console.log('\nFailed:');
  failedFiles.forEach((f) => console.log(`  ${f.file}: ${f.reason}`));
}

console.log(`\n=== OVERALL: ${allOk && failedFiles.length === 0 ? 'PASS' : 'FAIL'} ===`);
