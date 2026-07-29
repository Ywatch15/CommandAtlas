/**
 * pipeline-stages.test.js — Unit tests for content pipeline stages 01–03.
 *
 * TESTING_STRATEGY.md §2:
 *   - "Unit tests per build stage (scripts/stages/*) — parse, validate, diff, and
 *     generate stages each tested in isolation with fixture Markdown files."
 *   - "Fixture-based validation tests: a maintained set of intentionally-broken
 *     Markdown files — each fixture's corresponding validation rule must fire, and
 *     CI fails if any fixture unexpectedly passes."
 *
 * Uses Node's built-in test runner (node:test) — no external test framework,
 * consistent with ENGINEERING_RULES.md §10 (no redundant dependencies).
 *
 * Run: node --test scripts/tests/pipeline-stages.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';

// ── Import the stages under test ──────────────────────────────────────────────
import discover from '../stages/01-discover.js';
import parse from '../stages/02-parse.js';
import validate from '../stages/03-validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const BROKEN_DIR = path.join(FIXTURES_DIR, 'broken');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a temporary content directory with the given files.
 * Files is an object: { 'commands/linux/grep.md': '...content...' }
 * Returns the tempDir path; caller is responsible for cleanup.
 */
async function makeTempContent(files) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ca-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }
  return tmpDir;
}

/** Runs stages 01→02→03 against a temp content directory. */
async function runPipeline(contentDir) {
  const context = { contentDir };
  const options = { validateOnly: true };
  await discover(context, options);
  await parse(context, options);
  await validate(context, options);
  return context;
}

/** Runs stages 01→02→03 and expects a validation error. Returns the error. */
async function expectValidationError(contentDir) {
  try {
    await runPipeline(contentDir);
    throw new Error('Expected pipeline to throw a validation error, but it succeeded.');
  } catch (err) {
    if (!err.isValidationError) throw err; // unexpected error — re-throw
    return err;
  }
}

// ── Minimal valid content helpers ─────────────────────────────────────────────

const VALID_CATEGORY_MD = `---
slug: linux
name: Linux
description: Core Linux command-line tools.
parent: null
status: published
---

Linux is the canonical topic for core shell commands.
`;

function makeValidCommandMd(slug, category = 'linux') {
  return `---
slug: ${slug}
name: ${slug}
category: ${category}
difficulty: beginner
supportedOS: [linux]
status: published
---

## What is it?

\`${slug}\` does a thing.

## Why does it exist?

Because it is needed.

## Syntax

\`\`\`bash
${slug} [options]
\`\`\`

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| \`-v\` | Verbose output | \`${slug} -v\` |

## Examples

\`\`\`bash
${slug} example
\`\`\`

> Runs ${slug} with no options.

## Real-World Scenarios

Use \`${slug}\` when you need to demonstrate it in a test.

## When should it NOT be used?

Do not use \`${slug}\` when it is not appropriate.

## Alternatives

There are no direct alternatives in this fixture.

## How it works internally

\`${slug}\` calls the kernel via a system call.

## Performance Notes

Performance is acceptable for most workloads.

## Security Notes

No specific security considerations beyond standard file-permission awareness.

## Common Mistakes

Forgetting to specify the correct options.

## Best Practices

Always read the man page before using \`${slug}\`.

## Interview Questions

**Q:** What does \`${slug}\` do?
**A:** It does a thing.

## Practice Problems

**Problem:** Run \`${slug}\` with verbose output.
**Hint:** Use \`-v\`.
**Solution:** \`${slug} -v\`

## References

- [${slug} man page](https://www.man7.org/linux/man-pages/man1/${slug}.1.html)
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Stage 01 — Discover
// ─────────────────────────────────────────────────────────────────────────────

describe('Stage 01 — discover', () => {
  test('discovers a single command in a topic folder', async () => {
    const tmpDir = await makeTempContent({
      'commands/linux/grep.md': makeValidCommandMd('grep'),
    });
    try {
      const context = { contentDir: tmpDir };
      await discover(context, {});
      assert.equal(context.files.length, 1);
      assert.equal(context.files[0].type, 'command');
      assert.equal(context.files[0].slug, 'grep');
      assert.equal(context.files[0].folder, 'linux');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('discovers commands, workflows, and categories', async () => {
    const tmpDir = await makeTempContent({
      'commands/linux/grep.md': makeValidCommandMd('grep'),
      'workflows/deploy-node-app.md':
        '---\nslug: deploy-node-app\ntitle: Deploy\ncategory: devops-utilities\ndifficulty: intermediate\nsteps:\n  - command: grep\n    note: "test"\n  - command: grep\n    note: "test2"\nstatus: published\n---\n\nNarrative.\n',
      'categories/linux.md': VALID_CATEGORY_MD,
    });
    try {
      const context = { contentDir: tmpDir };
      await discover(context, {});
      assert.equal(context.files.filter((f) => f.type === 'command').length, 1);
      assert.equal(context.files.filter((f) => f.type === 'workflow').length, 1);
      assert.equal(context.files.filter((f) => f.type === 'category').length, 1);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('ignores .gitkeep files', async () => {
    const tmpDir = await makeTempContent({
      'commands/linux/.gitkeep': '',
    });
    try {
      const context = { contentDir: tmpDir };
      await discover(context, {});
      assert.equal(context.files.length, 0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('returns empty files for empty content directory', async () => {
    const tmpDir = await makeTempContent({});
    try {
      const context = { contentDir: tmpDir };
      await discover(context, {});
      assert.equal(context.files.length, 0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Stage 02 — Parse
// ─────────────────────────────────────────────────────────────────────────────

describe('Stage 02 — parse', () => {
  test('parses valid frontmatter and body', async () => {
    const tmpDir = await makeTempContent({
      'commands/linux/grep.md': makeValidCommandMd('grep'),
      'categories/linux.md': VALID_CATEGORY_MD,
    });
    try {
      const context = { contentDir: tmpDir };
      await discover(context, {});
      await parse(context, {});
      const grepRecord = context.records.find((r) => r.slug === 'grep');
      assert.ok(grepRecord);
      assert.equal(grepRecord.frontmatter.slug, 'grep');
      assert.equal(grepRecord.frontmatter.status, 'published');
      assert.ok(grepRecord.body.includes('## What is it?'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('fails on file with no frontmatter delimiter', async () => {
    const tmpDir = await makeTempContent({
      'commands/linux/grep.md': 'No frontmatter here, just prose.',
    });
    try {
      const err = await expectValidationError(tmpDir);
      assert.ok(
        err.failures.some((f) => f.rule === 'frontmatter-parse'),
        `Expected frontmatter-parse. Got: ${err.failures.map((f) => f.rule).join(', ')}`
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('fails on file with unclosed frontmatter', async () => {
    const tmpDir = await makeTempContent({
      'commands/linux/grep.md': '---\nslug: grep\n# no closing ---\n',
    });
    try {
      const context = { contentDir: tmpDir };
      await discover(context, {});
      let parseErr;
      try {
        await parse(context, {});
      } catch (e) {
        parseErr = e;
      }
      assert.ok(parseErr?.isValidationError);
      assert.ok(parseErr.failures.some((f) => f.rule === 'frontmatter-parse'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Stage 03 — Validate — Broken fixtures
// ─────────────────────────────────────────────────────────────────────────────

describe('Stage 03 — validate — broken fixtures', () => {
  // ── BROKEN FIXTURE 1: unqualified slug in git/ folder ──────────────────────
  // Expected to trigger: R03-slug-fully-qualified (ADR-007)
  // The fixture is scripts/tests/fixtures/broken/commit.md
  // slug is "commit" inside a git/ folder — must be "git-commit".
  test('R03: unqualified slug "commit" in git/ folder must fail', async () => {
    const commitContent = await fs.readFile(path.join(BROKEN_DIR, 'commit.md'), 'utf-8');
    const tmpDir = await makeTempContent({
      // We also need a category file to avoid R10 blocking before R03
      'categories/git.md': `---\nslug: git\nname: Git\ndescription: Git commands.\nparent: null\nstatus: published\n---\n`,
      'commands/git/commit.md': commitContent,
    });
    try {
      const err = await expectValidationError(tmpDir);
      const r03 = err.failures.find((f) => f.rule === 'R03-slug-fully-qualified');
      assert.ok(
        r03,
        `Expected R03-slug-fully-qualified failure. Got: ${err.failures.map((f) => f.rule).join(', ')}`
      );
      assert.ok(
        r03.message.includes('git-commit'),
        `Hint should suggest "git-commit": ${r03.message}`
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── BROKEN FIXTURE 2: invalid category + invalid difficulty ────────────────
  // Expected to trigger: R07-category-canonicalized AND R06-field-enum-values
  // The fixture is scripts/tests/fixtures/broken/grep.md
  test('R06 + R07: invalid difficulty and non-canonical category must both fail', async () => {
    const grepContent = await fs.readFile(path.join(BROKEN_DIR, 'grep.md'), 'utf-8');
    const tmpDir = await makeTempContent({
      'commands/linux/grep.md': grepContent,
    });
    try {
      const err = await expectValidationError(tmpDir);
      const r06 = err.failures.find((f) => f.rule === 'R06-field-enum-values');
      const r07 = err.failures.find((f) => f.rule === 'R07-category-canonicalized');
      assert.ok(
        r06,
        `Expected R06-field-enum-values. Got: ${err.failures.map((f) => f.rule).join(', ')}`
      );
      assert.ok(
        r07,
        `Expected R07-category-canonicalized. Got: ${err.failures.map((f) => f.rule).join(', ')}`
      );
      assert.ok(
        r06.message.includes('superhard'),
        `R06 should mention "superhard": ${r06.message}`
      );
      assert.ok(
        r07.message.includes('notavalidcategory'),
        `R07 should mention "notavalidcategory": ${r07.message}`
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── R01: slug-filename mismatch ────────────────────────────────────────────
  test('R01: slug in frontmatter not matching filename must fail', async () => {
    const tmpDir = await makeTempContent({
      'categories/linux.md': VALID_CATEGORY_MD,
      // File is named "ls.md" but slug field says "grep"
      'commands/linux/ls.md': makeValidCommandMd('grep'),
    });
    try {
      const err = await expectValidationError(tmpDir);
      const r01 = err.failures.find((f) => f.rule === 'R01-slug-filename-match');
      assert.ok(r01, `Expected R01. Got: ${err.failures.map((f) => f.rule).join(', ')}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── R04: duplicate slug ────────────────────────────────────────────────────
  test('R04: duplicate slug across two commands must fail', async () => {
    const tmpDir = await makeTempContent({
      'categories/linux.md': VALID_CATEGORY_MD,
      'categories/unix.md': VALID_CATEGORY_MD.replace('slug: linux', 'slug: unix').replace(
        'name: Linux',
        'name: Unix'
      ),
      'commands/linux/grep.md': makeValidCommandMd('grep', 'linux'),
      'commands/unix/grep.md': makeValidCommandMd('grep', 'unix'),
    });
    try {
      const err = await expectValidationError(tmpDir);
      const r04 = err.failures.find((f) => f.rule === 'R04-slug-globally-unique');
      assert.ok(r04, `Expected R04. Got: ${err.failures.map((f) => f.rule).join(', ')}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── R05: missing required field ───────────────────────────────────────────
  test('R05: missing required "status" field must fail', async () => {
    const md = makeValidCommandMd('grep').replace('status: published', '');
    const tmpDir = await makeTempContent({
      'categories/linux.md': VALID_CATEGORY_MD,
      'commands/linux/grep.md': md,
    });
    try {
      const err = await expectValidationError(tmpDir);
      const r05 = err.failures.find((f) => f.rule === 'R05-required-fields');
      assert.ok(r05, `Expected R05. Got: ${err.failures.map((f) => f.rule).join(', ')}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── R12: missing body section ────────────────────────────────────────────
  test('R12: command missing required body section must fail', async () => {
    const md = makeValidCommandMd('grep').replace(
      '## References\n\n- [grep man page](https://www.man7.org/linux/man-pages/man1/grep.1.html)\n',
      ''
    );
    const tmpDir = await makeTempContent({
      'categories/linux.md': VALID_CATEGORY_MD,
      'commands/linux/grep.md': md,
    });
    try {
      const err = await expectValidationError(tmpDir);
      const r12 = err.failures.find((f) => f.rule === 'R12-body-sections-present');
      assert.ok(r12, `Expected R12. Got: ${err.failures.map((f) => f.rule).join(', ')}`);
      assert.ok(r12.message.includes('References'), `Should mention "References": ${r12.message}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── R13: body sections out of order ──────────────────────────────────────
  test('R13: sections out of order must fail', async () => {
    // Swap "Alternatives" and "When should it NOT be used?" — wrong order
    const md = makeValidCommandMd('grep').replace(
      '## When should it NOT be used?\n\nDo not use `grep` when it is not appropriate.\n\n## Alternatives\n\nThere are no direct alternatives in this fixture.\n',
      '## Alternatives\n\nThere are no direct alternatives in this fixture.\n\n## When should it NOT be used?\n\nDo not use `grep` when it is not appropriate.\n\n'
    );
    const tmpDir = await makeTempContent({
      'categories/linux.md': VALID_CATEGORY_MD,
      'commands/linux/grep.md': md,
    });
    try {
      const err = await expectValidationError(tmpDir);
      const r13 = err.failures.find((f) => f.rule === 'R13-body-sections-ordered');
      assert.ok(r13, `Expected R13. Got: ${err.failures.map((f) => f.rule).join(', ')}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── Happy path: valid command passes all validation ───────────────────────
  test('valid command with all sections passes validation cleanly', async () => {
    const tmpDir = await makeTempContent({
      'categories/linux.md': VALID_CATEGORY_MD,
      'commands/linux/grep.md': makeValidCommandMd('grep'),
    });
    try {
      // Should not throw
      await runPipeline(tmpDir);
    } catch (err) {
      console.error('Happy path validation failed with:', err);
      if (err.isValidationError) {
        console.error('Validation failures:', JSON.stringify(err.failures, null, 2));
      }
      throw err;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
