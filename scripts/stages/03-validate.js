/**
 * 03-validate.js — Stage 03: Validate all parsed records.
 *
 * ARCHITECTURE.md §2: "03-validate → schema, slugs, links, order"
 *
 * Input:  context.records (from stage 02)
 * Output: none — either passes silently or throws a ValidationError.
 *         Pipeline halts on any failure; nothing partially valid proceeds.
 *
 * Validation rules enforced (all mechanical, per CONTENT_GUIDELINES.md):
 *
 *   R01 slug-filename-match:     slug frontmatter field must exactly match filename.
 *   R02 slug-format:             slug is lowercase, hyphen-separated, ASCII only.
 *   R03 slug-fully-qualified:    multi-word command slugs must include tool name
 *                                (ADR-007 / CONTENT_GUIDELINES.md §2).
 *   R04 slug-globally-unique:    no two records share a slug (commands + workflows).
 *   R05 required-fields:         all required frontmatter fields present and non-null.
 *   R06 field-enum-values:       difficulty, status, supportedOS, supportedShells
 *                                contain only known enum values.
 *   R07 category-canonicalized:  category value is the exact canonical slug form
 *                                of a PROJECT_CONTEXT.md §8 topic (ADR-008).
 *   R08 related-slugs-exist:     relatedCommands, alternatives resolve to known slugs.
 *   R09 workflow-steps-exist:    each steps[].command resolves to a known command slug.
 *   R10 category-file-exists:    category referenced in frontmatter resolves to an
 *                                existing content/categories/*.md file.
 *   R11 category-parent-valid:   category parent (if not null) resolves to another
 *                                category; no circular chains.
 *   R12 body-sections-present:   all 16 required sections present (commands only).
 *   R13 body-sections-ordered:   sections appear in the exact required order.
 *   R14 min-workflow-steps:      workflows must have at least 2 steps.
 */

import {
  REQUIRED_COMMAND_FIELDS,
  REQUIRED_WORKFLOW_FIELDS,
  REQUIRED_CATEGORY_FIELDS,
  REQUIRED_COMMAND_SECTIONS,
  DIFFICULTY,
  STATUS,
  SUPPORTED_OS,
  SUPPORTED_SHELL,
  VALID_CATEGORY_SLUGS,
} from '../../packages/shared/constants.js';

/**
 * @param {object} context
 * @param {Array}  context.records
 * @param {object} _options
 */
export default async function validate(context, _options) {
  const { records } = context;

  const failures = [];

  // Build slug → record map for cross-reference checks (R08, R09, R10).
  // We build it before the per-record loop so every record can check against
  // the full corpus (not just records seen so far).
  const slugMap = buildSlugMap(records, failures);
  const categorySlugSet = new Set(records.filter((r) => r.type === 'category').map((r) => r.slug));

  for (const record of records) {
    const ctx = { record, slugMap, categorySlugSet, failures };

    if (record.type === 'command') {
      validateCommand(ctx);
    } else if (record.type === 'workflow') {
      validateWorkflow(ctx);
    } else if (record.type === 'category') {
      validateCategory(ctx);
    }
  }

  // R11: category circular parent check (needs all categories read first)
  validateCategoryParentChains(records, categorySlugSet, failures);

  // R15 (Warning): Bidirectionality lint for relatedCommands and alternatives
  validateBidirectionality(records, slugMap);

  if (failures.length > 0) {
    const err = new Error('Validation failed.');
    err.isValidationError = true;
    err.failures = failures;
    throw err;
  }

  const commandCount = records.filter((r) => r.type === 'command').length;
  const workflowCount = records.filter((r) => r.type === 'workflow').length;
  const categoryCount = records.filter((r) => r.type === 'category').length;
  process.stdout.write(
    ` → ${commandCount} command(s), ${workflowCount} workflow(s), ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'} — all valid`
  );
}

// ── Slug map ──────────────────────────────────────────────────────────────────

/**
 * Build a map of slug → record. Populates failures for duplicate slugs (R04).
 * Commands and workflows share the same global slug namespace.
 */
function buildSlugMap(records, failures) {
  const map = new Map();
  for (const record of records) {
    if (record.type === 'category') continue; // categories have a separate namespace

    const existing = map.get(record.slug);
    if (existing) {
      failures.push({
        file: record.path,
        rule: 'R04-slug-globally-unique',
        message: `Duplicate slug "${record.slug}" — also used by ${existing.path}`,
        hint: 'Slugs must be globally unique across all commands and workflows. For multi-word commands, ensure the slug is fully qualified with the tool name (ADR-007).',
      });
    } else {
      map.set(record.slug, record);
    }
  }
  return map;
}

// ── Command validation ────────────────────────────────────────────────────────

function validateCommand({ record, slugMap, categorySlugSet, failures }) {
  const { frontmatter, body, slug, path: filePath } = record;
  const fm = frontmatter;
  const push = (rule, message, hint) => failures.push({ file: filePath, rule, message, hint });

  // R01: slug must match filename
  if (fm.slug !== slug) {
    push(
      'R01-slug-filename-match',
      `Frontmatter slug "${fm.slug}" does not match filename "${slug}.md".`,
      'The slug: field must exactly match the filename without the .md extension.'
    );
  }

  // R02: slug format — lowercase, hyphen-separated, ASCII only
  if (fm.slug && !isValidSlugFormat(fm.slug)) {
    push(
      'R02-slug-format',
      `Slug "${fm.slug}" contains invalid characters. Must be lowercase, hyphen-separated, ASCII only.`,
      'Examples: grep, git-commit, docker-run'
    );
  }

  // R03: fully-qualified slug — if the command requires a subcommand to invoke,
  // we check that the slug is fully qualified with the tool name (ADR-007).
  // We map folders representing multi-command tools to their expected tool prefix.
  const subcommandToolMap = {
    git: 'git',
    docker: 'docker',
    kubernetes: 'kubectl',
  };

  if (record.folder) {
    const folderName = record.folder;
    const toolPrefix = subcommandToolMap[folderName];
    if (toolPrefix) {
      // The slug must be the tool itself (e.g. 'git') or start with the tool prefix (e.g. 'git-')
      if (fm.slug && fm.slug !== toolPrefix && !fm.slug.startsWith(`${toolPrefix}-`)) {
        push(
          'R03-slug-fully-qualified',
          `Slug "${fm.slug}" in folder "${folderName}/" must be fully qualified: "${toolPrefix}-${fm.slug}".`,
          `ADR-007: every subcommand slug includes its tool name. "${fm.slug}" in ${folderName}/ must be prefixed with "${toolPrefix}-".`
        );
      }
    }
  }

  // R05: required fields
  for (const field of REQUIRED_COMMAND_FIELDS) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === '') {
      push(
        'R05-required-fields',
        `Missing required frontmatter field: "${field}".`,
        `CONTENT_GUIDELINES.md §4 required fields: ${REQUIRED_COMMAND_FIELDS.join(', ')}`
      );
    }
  }

  // R06: enum values
  if (fm.difficulty && !Object.values(DIFFICULTY).includes(fm.difficulty)) {
    push(
      'R06-field-enum-values',
      `Invalid difficulty "${fm.difficulty}". Must be one of: ${Object.values(DIFFICULTY).join(', ')}.`,
      null
    );
  }
  if (fm.status && !Object.values(STATUS).includes(fm.status)) {
    push(
      'R06-field-enum-values',
      `Invalid status "${fm.status}". Must be one of: ${Object.values(STATUS).join(', ')}.`,
      null
    );
  }
  if (fm.supportedOS && Array.isArray(fm.supportedOS)) {
    const validOS = Object.values(SUPPORTED_OS);
    for (const os of fm.supportedOS) {
      if (!validOS.includes(os)) {
        push(
          'R06-field-enum-values',
          `Invalid supportedOS value "${os}". Must be one of: ${validOS.join(', ')}.`,
          null
        );
      }
    }
  }
  if (fm.supportedShells && Array.isArray(fm.supportedShells)) {
    const validShells = Object.values(SUPPORTED_SHELL);
    for (const shell of fm.supportedShells) {
      if (!validShells.includes(shell)) {
        push(
          'R06-field-enum-values',
          `Invalid supportedShells value "${shell}". Must be one of: ${validShells.join(', ')}.`,
          null
        );
      }
    }
  }

  // R07: category canonicalization (ADR-008)
  validateCategoryField(fm.category, filePath, failures);

  // R08: relatedCommands and alternatives resolve to known slugs
  if (fm.relatedCommands && Array.isArray(fm.relatedCommands)) {
    for (const ref of fm.relatedCommands) {
      if (!slugMap.has(ref)) {
        push(
          'R08-related-slugs-exist',
          `relatedCommands references unknown slug "${ref}".`,
          'Every relatedCommands entry must match an existing command slug in the corpus.'
        );
      }
    }
  }
  if (fm.alternatives && Array.isArray(fm.alternatives)) {
    for (const ref of fm.alternatives) {
      if (!slugMap.has(ref)) {
        push(
          'R08-related-slugs-exist',
          `alternatives references unknown slug "${ref}".`,
          'Every alternatives entry must match an existing command slug in the corpus.'
        );
      }
    }
  }

  // R10: category file existence
  validateCategoryFileExists(fm.category, filePath, categorySlugSet, failures);

  // R12 + R13: body section presence and order
  validateCommandBody(body, filePath, failures);
}

// ── Workflow validation ───────────────────────────────────────────────────────

function validateWorkflow({ record, slugMap, categorySlugSet, failures }) {
  const { frontmatter, slug, path: filePath } = record;
  const fm = frontmatter;
  const push = (rule, message, hint) => failures.push({ file: filePath, rule, message, hint });

  // R01
  if (fm.slug !== slug) {
    push(
      'R01-slug-filename-match',
      `Frontmatter slug "${fm.slug}" does not match filename "${slug}.md".`,
      null
    );
  }

  // R02
  if (fm.slug && !isValidSlugFormat(fm.slug)) {
    push('R02-slug-format', `Slug "${fm.slug}" contains invalid characters.`, null);
  }

  // R05
  for (const field of REQUIRED_WORKFLOW_FIELDS) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === '') {
      push('R05-required-fields', `Missing required field: "${field}".`, null);
    }
  }

  // R06
  if (fm.difficulty && !Object.values(DIFFICULTY).includes(fm.difficulty)) {
    push('R06-field-enum-values', `Invalid difficulty "${fm.difficulty}".`, null);
  }
  if (fm.status && !Object.values(STATUS).includes(fm.status)) {
    push('R06-field-enum-values', `Invalid status "${fm.status}".`, null);
  }

  // R07
  validateCategoryField(fm.category, filePath, failures);

  // R09: each step's command resolves to a known slug
  if (fm.steps && Array.isArray(fm.steps)) {
    // R14: minimum 2 steps
    if (fm.steps.length < 2) {
      push('R14-min-workflow-steps', 'Workflows must have at least 2 steps.', null);
    }
    for (const step of fm.steps) {
      if (!step.command) {
        push('R09-workflow-steps-exist', 'A step is missing its command field.', null);
      } else if (!slugMap.has(step.command)) {
        push(
          'R09-workflow-steps-exist',
          `Step references unknown command slug "${step.command}".`,
          'Every step.command must match an existing command slug in the corpus.'
        );
      }
    }
  }

  // R10
  validateCategoryFileExists(fm.category, filePath, categorySlugSet, failures);
}

// ── Category validation ───────────────────────────────────────────────────────

function validateCategory({ record, _categorySlugSet, failures }) {
  const { frontmatter, slug, path: filePath } = record;
  const fm = frontmatter;
  const push = (rule, message, hint) => failures.push({ file: filePath, rule, message, hint });

  // R01
  if (fm.slug !== slug) {
    push(
      'R01-slug-filename-match',
      `Slug "${fm.slug}" does not match filename "${slug}.md".`,
      null
    );
  }

  // R07: category slug itself must be canonical
  if (fm.slug && !VALID_CATEGORY_SLUGS.has(fm.slug)) {
    // It might also be a valid sub-category slug (not a top-level topic) —
    // for now we only validate top-level categories. Sub-categories are allowed
    // but their parent must resolve to a top-level canonical slug.
    // We will validate parent chains in validateCategoryParentChains.
  }

  // R05
  for (const field of REQUIRED_CATEGORY_FIELDS) {
    // 'parent' is required but may be null — check for key existence, not truthiness.
    if (!(field in fm)) {
      push(
        'R05-required-fields',
        `Missing required category field: "${field}".`,
        'CONTENT_GUIDELINES.md §6: parent is required but may be explicitly null.'
      );
    }
  }

  // R06
  if (fm.status && !Object.values(STATUS).includes(fm.status)) {
    push('R06-field-enum-values', `Invalid category status "${fm.status}".`, null);
  }
}

// ── Category parent chain validation ─────────────────────────────────────────

function validateCategoryParentChains(records, categorySlugSet, failures) {
  const categoryMap = new Map(records.filter((r) => r.type === 'category').map((r) => [r.slug, r]));

  for (const record of categoryMap.values()) {
    const parent = record.frontmatter.parent;
    if (parent === null || parent === undefined) continue;

    if (!categorySlugSet.has(parent)) {
      failures.push({
        file: record.path,
        rule: 'R11-category-parent-valid',
        message: `Category parent "${parent}" does not resolve to an existing category file.`,
        hint: 'parent must be null or the slug of another existing category.',
      });
      continue;
    }

    // Check for circular reference (walk up the chain, limit to corpus size)
    const visited = new Set([record.slug]);
    let current = parent;
    while (current) {
      if (visited.has(current)) {
        failures.push({
          file: record.path,
          rule: 'R11-category-parent-valid',
          message: `Circular parent reference detected involving slug "${current}".`,
          hint: 'A category cannot be its own ancestor.',
        });
        break;
      }
      visited.add(current);
      const parentRecord = categoryMap.get(current);
      current = parentRecord?.frontmatter?.parent ?? null;
    }
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * isValidSlugFormat — R02.
 * Slug must be lowercase, ASCII letters/digits, hyphens only. No spaces, no uppercase.
 */
function isValidSlugFormat(slug) {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug);
}

/**
 * validateCategoryField — R07 (ADR-008).
 *
 * The category field can be:
 *   "linux"                   → top-level canonical slug
 *   "linux/text-processing"   → top-level/sub-category (slash-delimited)
 *
 * The top-level segment must be a valid canonical slug.
 */
function validateCategoryField(category, filePath, failures) {
  if (!category) return;

  const topLevel = category.split('/')[0];
  if (!VALID_CATEGORY_SLUGS.has(topLevel)) {
    const validList = [...VALID_CATEGORY_SLUGS].join(', ');
    failures.push({
      file: filePath,
      rule: 'R07-category-canonicalized',
      message: `Category "${category}" has invalid top-level segment "${topLevel}".`,
      hint: `Top-level category must be the lowercase-hyphenated form of a canonical topic (ADR-008). Valid: ${validList}`,
    });
  }
}

/**
 * validateCategoryFileExists — R10.
 * The top-level segment of category must correspond to an existing categories/*.md file.
 */
function validateCategoryFileExists(category, filePath, categorySlugSet, failures) {
  if (!category) return;
  const topLevel = category.split('/')[0];
  if (VALID_CATEGORY_SLUGS.has(topLevel) && !categorySlugSet.has(topLevel)) {
    failures.push({
      file: filePath,
      rule: 'R10-category-file-exists',
      message: `Category "${topLevel}" is valid but no content/categories/${topLevel}.md file exists.`,
      hint: `Create content/categories/${topLevel}.md before referencing it in frontmatter.`,
    });
  }
}

/**
 * validateCommandBody — R12 + R13.
 *
 * Checks that all 16 required sections are present (R12) and in the correct
 * order (R13). Sections are identified by '## <SectionName>' headings.
 * (CONTENT_GUIDELINES.md §7)
 */
function validateCommandBody(body, filePath, failures) {
  // Extract all H2 headings from the body
  const headingPattern = /^##\s+(.+)$/gm;
  const foundSections = [];
  let match;
  while ((match = headingPattern.exec(body)) !== null) {
    foundSections.push(match[1].trim());
  }

  const required = REQUIRED_COMMAND_SECTIONS;

  // R12: all required sections must be present
  for (const section of required) {
    if (!foundSections.includes(section)) {
      failures.push({
        file: filePath,
        rule: 'R12-body-sections-present',
        message: `Missing required section: "## ${section}"`,
        hint: 'If this section is genuinely not applicable, include it with an explicit one-line statement rather than omitting it (CONTENT_GUIDELINES.md §7).',
      });
    }
  }

  // R13: sections must appear in the required order
  // Filter foundSections to only those in the required list, then check order.
  const foundRequired = foundSections.filter((s) => required.includes(s));
  for (let i = 0; i < foundRequired.length; i++) {
    const expectedIndex = required.indexOf(foundRequired[i]);
    if (i > 0) {
      const prevExpectedIndex = required.indexOf(foundRequired[i - 1]);
      if (expectedIndex < prevExpectedIndex) {
        failures.push({
          file: filePath,
          rule: 'R13-body-sections-ordered',
          message: `Section "## ${foundRequired[i]}" appears before "## ${foundRequired[i - 1]}", violating required order.`,
          hint: `Required order: ${required.map((s) => `"${s}"`).join(' → ')}`,
        });
      }
    }
  }
}

/**
 * validateBidirectionality — R15 (Warning).
 * Flags asymmetric relatedCommands or alternatives references.
 */
function validateBidirectionality(records, slugMap) {
  const warnings = [];
  const commands = records.filter((r) => r.type === 'command');

  for (const cmd of commands) {
    const fm = cmd.frontmatter || {};
    const related = fm.relatedCommands || [];
    const alternatives = fm.alternatives || [];

    for (const ref of related) {
      const target = slugMap.get(ref);
      if (target) {
        const targetFm = target.frontmatter || {};
        const targetRefs = [...(targetFm.relatedCommands || []), ...(targetFm.alternatives || [])];
        if (!targetRefs.includes(cmd.slug)) {
          warnings.push(
            `⚠ [R15-bidirectionality] ${cmd.slug} references "${ref}" in relatedCommands, but "${ref}" does not reference back to ${cmd.slug}`
          );
        }
      }
    }

    for (const ref of alternatives) {
      const target = slugMap.get(ref);
      if (target) {
        const targetFm = target.frontmatter || {};
        const targetRefs = [...(targetFm.relatedCommands || []), ...(targetFm.alternatives || [])];
        if (!targetRefs.includes(cmd.slug)) {
          warnings.push(
            `⚠ [R15-bidirectionality] ${cmd.slug} references "${ref}" in alternatives, but "${ref}" does not reference back to ${cmd.slug}`
          );
        }
      }
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      process.stdout.write(`\n  ${w}`);
    }
  }
}
