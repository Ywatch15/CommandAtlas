import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import {
  CANONICAL_TOPICS,
  canonicalizeCategorySlug,
  REQUIRED_COMMAND_FIELDS,
  REQUIRED_COMMAND_SECTIONS,
} from '../../packages/shared/constants.js';

const CONTENT_DIR = path.resolve('content/commands');

const topicStats = {};

const EXCEPTIONS = ['setuid', 'setgid', 'sticky-bit'];

function splitFrontmatter(rawContent) {
  const lines = rawContent.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    return { error: 'Missing opening frontmatter delimiter ---' };
  }
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIdx = i;
      break;
    }
  }
  if (closingIdx === -1) {
    return { error: 'Missing closing frontmatter delimiter ---' };
  }
  const fmLines = lines.slice(1, closingIdx).join('\n');
  const bodyLines = lines.slice(closingIdx + 1).join('\n');

  try {
    const frontmatter = parseYaml(fmLines) || {};
    return { frontmatter, body: bodyLines };
  } catch (e) {
    return { error: `YAML parse error: ${e.message}` };
  }
}

for (const topicDisplay of CANONICAL_TOPICS) {
  const topicSlug = canonicalizeCategorySlug(topicDisplay);
  const topicDir = path.join(CONTENT_DIR, topicSlug);

  topicStats[topicSlug] = {
    topicDisplay,
    topicSlug,
    fileCount: 0,
    passCount: 0,
    failCount: 0,
    errors: [],
  };

  if (!fs.existsSync(topicDir)) {
    topicStats[topicSlug].errors.push(`Directory missing: ${topicDir}`);
    continue;
  }

  const files = fs.readdirSync(topicDir).filter((f) => f.endsWith('.md'));
  topicStats[topicSlug].fileCount = files.length;

  for (const file of files) {
    const filePath = path.join(topicDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const filenameSlug = file.replace('.md', '');
    const fileErrors = [];

    if (!content.trim()) {
      fileErrors.push('File is empty');
    }

    const parsed = splitFrontmatter(content);
    if (parsed.error) {
      fileErrors.push(parsed.error);
    } else {
      const fm = parsed.frontmatter;

      // Check required fields
      for (const field of REQUIRED_COMMAND_FIELDS) {
        if (fm[field] === undefined || fm[field] === null || fm[field] === '') {
          fileErrors.push(`Missing required field: ${field}`);
        }
      }

      // Check slug matches filename
      if (fm.slug !== filenameSlug) {
        fileErrors.push(`Slug mismatch: frontmatter '${fm.slug}' vs filename '${filenameSlug}'`);
      }

      // Check category matches folder/canonical slug
      if (fm.category !== topicSlug) {
        fileErrors.push(
          `Misfiled/Category mismatch: frontmatter category '${fm.category}' vs folder topic '${topicSlug}'`
        );
      }

      // Check recommended array fields presence
      ['tags', 'supportedShells', 'intentPhrases', 'relatedCommands', 'alternatives'].forEach(
        (key) => {
          if (!(key in fm)) {
            fileErrors.push(`Missing field: ${key}`);
          }
        }
      );

      // Body section checks
      const isRegexPage = filenameSlug.startsWith('regex-');
      const isSyscallPage = filenameSlug.startsWith('syscall-');
      const isAdrException = EXCEPTIONS.includes(filenameSlug);

      if (!isRegexPage && !isSyscallPage && !isAdrException) {
        const body = parsed.body || '';
        const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

        REQUIRED_COMMAND_SECTIONS.forEach((sec, idx) => {
          if (headings[idx] !== sec) {
            fileErrors.push(
              `Section mismatch at index ${idx}: expected '## ${sec}', found '## ${headings[idx] || 'MISSING'}'`
            );
          }
        });

        if (headings.length !== REQUIRED_COMMAND_SECTIONS.length) {
          fileErrors.push(
            `Section count mismatch: expected ${REQUIRED_COMMAND_SECTIONS.length}, found ${headings.length}`
          );
        }
      }
    }

    if (fileErrors.length === 0) {
      topicStats[topicSlug].passCount++;
    } else {
      topicStats[topicSlug].failCount++;
      topicStats[topicSlug].errors.push(`${file}: ${fileErrors.join(' | ')}`);
    }
  }
}

console.log(JSON.stringify(topicStats, null, 2));
