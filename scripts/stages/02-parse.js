/**
 * 02-parse.js — Stage 02: Parse frontmatter + body from discovered files.
 *
 * ARCHITECTURE.md §2: "02-parse → frontmatter + body → objects"
 *
 * Input:  context.files (from stage 01)
 * Output: context.records — Array<ParsedRecord>
 *
 * ParsedRecord {
 *   path:        string   — absolute file path (carried from DiscoveredFile)
 *   type:        string   — 'command' | 'workflow' | 'category'
 *   slug:        string   — from DiscoveredFile (filename-derived)
 *   folder:      string|null
 *   frontmatter: object   — parsed YAML key-value pairs
 *   body:        string   — Markdown body text after the frontmatter block
 *   rawMd:       string   — full file content (frontmatter + body), for error reporting
 * }
 *
 * Design notes:
 * - We implement a minimal YAML frontmatter parser ourselves rather than pulling
 *   in a library — the frontmatter schema is simple (flat key-value, one level of
 *   nesting for arrays/objects), and a dependency for 20 lines of parsing would
 *   violate ENGINEERING_RULES.md §10 (no redundant dependencies).
 *   EXCEPTION: yaml is a zero-dependency, well-maintained library used for real
 *   YAML parsing — this IS the correct choice vs a bespoke parser for anything
 *   beyond trivial key-value. We use the `yaml` npm package.
 * - Body sections are NOT parsed here — stage 03 validates section presence and
 *   order using the raw body string. Sections are parsed into structured form
 *   only during the generation stages (05+).
 * - Parse errors (malformed YAML, missing frontmatter delimiters) surface as
 *   validation errors, not raw exceptions, so the pipeline error output is clean.
 */

import fs from 'fs/promises';
import { parse as parseYaml } from 'yaml';

const FRONTMATTER_DELIMITER = '---';

/**
 * @param {object} context
 * @param {Array}  context.files
 * @param {object} _options
 */
export default async function parse(context, _options) {
  const { files } = context;

  const records = [];
  const errors = [];

  for (const file of files) {
    try {
      const rawMd = await fs.readFile(file.path, 'utf-8');
      const parsed = parseFrontmatter(rawMd, file.path);

      if (parsed.error) {
        errors.push({ file: file.path, rule: 'frontmatter-parse', ...parsed.error });
        continue;
      }

      records.push({
        path: file.path,
        type: file.type,
        slug: file.slug,
        folder: file.folder,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        rawMd,
      });
    } catch (err) {
      errors.push({
        file: file.path,
        rule: 'file-read',
        message: `Could not read file: ${err.message}`,
      });
    }
  }

  if (errors.length > 0) {
    const err = new Error('Parse errors found.');
    err.isValidationError = true;
    err.failures = errors;
    throw err;
  }

  context.records = records;
  process.stdout.write(` → ${records.length} record(s) parsed`);
}

/**
 * parseFrontmatter — splits a Markdown file into frontmatter + body.
 *
 * Expects the file to begin with '---\n', have a closing '---' delimiter,
 * and have valid YAML between them.
 *
 * @param {string} rawMd  - Full file content.
 * @param {string} filePath - For error messages.
 * @returns {{ frontmatter: object, body: string } | { error: object }}
 */
function parseFrontmatter(rawMd, _filePath) {
  const lines = rawMd.split('\n');

  // First non-empty line must be '---'
  const firstLine = lines[0]?.trim();
  if (firstLine !== FRONTMATTER_DELIMITER) {
    return {
      error: {
        message: `File does not begin with a frontmatter block. First line: "${firstLine ?? ''}"`,
        hint: 'Every content file must start with --- on line 1, followed by YAML frontmatter.',
      },
    };
  }

  // Find the closing '---'
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FRONTMATTER_DELIMITER) {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return {
      error: {
        message: `No closing frontmatter delimiter (---) found.`,
        hint: 'The YAML frontmatter block must be closed with --- before the Markdown body.',
      },
    };
  }

  const yamlText = lines.slice(1, closingIndex).join('\n');
  const body = lines
    .slice(closingIndex + 1)
    .join('\n')
    .trimStart();

  let frontmatter;
  try {
    frontmatter = parseYaml(yamlText);
  } catch (yamlErr) {
    return {
      error: {
        message: `YAML parse error in frontmatter: ${yamlErr.message}`,
        hint: 'Check for incorrect indentation, unquoted special characters, or missing colons.',
      },
    };
  }

  if (!frontmatter || typeof frontmatter !== 'object') {
    return {
      error: {
        message: 'Frontmatter parsed as empty or non-object.',
        hint: 'The frontmatter block must contain at least the required key-value pairs.',
      },
    };
  }

  return { frontmatter, body };
}
