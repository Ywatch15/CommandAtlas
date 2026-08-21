import { marked } from 'marked';
import createDOMPurify from 'dompurify';

let DOMPurify = null;

/**
 * Lazily initialises DOMPurify from the ESM import.
 * Only runs in browser (window exists). SSG/Node skips — first-party content
 * only at build time; client rehydration always sanitizes.
 * ARCHITECTURE.md §13, invariant §14.6.
 */
function getSanitizer() {
  if (DOMPurify) return DOMPurify;
  if (typeof window !== 'undefined') {
    DOMPurify = createDOMPurify(window);
    return DOMPurify;
  }
  return null;
}

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'span',
  'div',
  'del',
  's',
  'sub',
  'sup',
];

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'class',
  'id',
  'style',
  'type',
  'checked',
  'disabled',
  'src',
  'alt',
  'title',
];

/**
 * Parses markdown to sanitized HTML.
 * @param {string} markdown
 * @returns {string} Sanitized HTML string.
 */
export function parseAndSanitizeMarkdown(markdown) {
  if (!markdown) return '';
  const rawHtml = marked.parse(markdown, { gfm: true, breaks: true });

  const sanitizer = getSanitizer();
  if (sanitizer) {
    return sanitizer.sanitize(rawHtml, { ALLOWED_TAGS, ALLOWED_ATTR });
  }
  // SSG path — first-party content only, sanitized on client rehydration
  return rawHtml;
}

/**
 * Splits command markdown body into sections by H2 headings.
 * @param {string} body
 * @returns {Record<string, string>}
 */
export function parseBodySections(body) {
  if (!body) return {};
  const normalizedBody = body.replace(/\r\n/g, '\n');
  const sections = {};
  const regex = /^##\s+(.+)$/gm;
  let match;
  const indices = [];
  while ((match = regex.exec(normalizedBody)) !== null) {
    indices.push({
      title: match[1].trim(),
      index: match.index,
      headerLength: match[0].length,
    });
  }

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index + indices[i].headerLength;
    const end = i < indices.length - 1 ? indices[i + 1].index : normalizedBody.length;
    const content = normalizedBody.substring(start, end).trim();
    sections[indices[i].title] = content;
  }
  return sections;
}

/**
 * Safely extracts a clean plain-text summary from a command object.
 * Sourced from (a) frontmatter.summary, or (b) the first paragraph of 'What is it?'.
 * Never returns section headings like '## What is it?' or raw Markdown formatting.
 * @param {object} cmd
 * @returns {string}
 */
export function extractCommandSummary(cmd) {
  if (!cmd) return '';
  if (cmd.frontmatter?.summary) return cmd.frontmatter.summary;

  const sections = parseBodySections(cmd.body || '');
  const whatIsIt = sections['What is it?'] || cmd.body || '';

  const paragraphs = whatIsIt
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !p.startsWith('```'));

  if (paragraphs.length > 0) {
    return paragraphs[0]
      .replace(/#+\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
  }
  return '';
}

/**
 * Extracts raw code from the first fenced code block in markdown.
 * @param {string} markdown
 * @returns {string}
 */
export function extractCodeBlock(markdown) {
  if (!markdown) return '';
  const match = markdown.match(/```[a-zA-Z0-9]*\n([\s\S]*?)\n```/);
  return match ? match[1] : markdown.trim();
}

/**
 * Parses raw markdown from an "Interview Questions" section into a flat array
 * of {question, answer} objects. Handles both structural variants:
 *   - blank-line-separated Q/A pairs (bg.md style): **Q: text?**\n**A:** text
 *   - inline/no-blank-line Q/A pairs (bind.md style): **Q:** text\n**A:** text
 * Normalizes all source variance into one clean shape.
 *
 * @param {string} sectionMarkdown — raw markdown text of the IQ section
 * @returns {Array<{question: string, answer: string}>}
 */
export function parseInterviewQuestions(sectionMarkdown) {
  if (!sectionMarkdown || !sectionMarkdown.trim()) return [];

  const text = sectionMarkdown.replace(/\r\n/g, '\n').trim();

  // Split on the start of each **Q pattern using a lookahead.
  // Matches both **Q:** (closing bold before text) and **Q: (bold wraps question).
  // Uses [*] character class to avoid any regex-escaping ambiguity.
  const qBlocks = text.split(/(?=[*][*]Q:)/);

  const pairs = [];
  for (const block of qBlocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('**Q:')) continue;

    // Split this Q-block on the **A:** or **A** marker to separate question from answer.
    // The A marker may appear as: **A:** or **A**:
    const aParts = trimmed.split(/[*][*]A:?[*][*]\s*/);

    let question = (aParts[0] || '').trim();
    const answer = (aParts.slice(1).join('\n') || '').trim();

    // Clean question prefix.
    // Variant 1: **Q:** text  → remove **Q:**  (6 chars)
    // Variant 2: **Q: text?** → remove **Q:  and trailing **
    question = question
      .replace(/^[*][*]Q:[*][*]\s*/, '') // variant 1: **Q:** prefix
      .replace(/^[*][*]Q:\s*/, '') // variant 2: **Q: prefix
      .replace(/[*][*]\s*$/, '') // trailing ** from variant 2
      .trim();

    if (question) {
      pairs.push({ question, answer });
    }
  }

  return pairs;
}

/**
 * Parses raw markdown from a "Practice Problems" section into a flat array
 * of {problem, hint, solution} objects.
 *
 * @param {string} sectionMarkdown
 * @returns {Array<{problem: string, hint: string, solution: string}>}
 */
export function parsePracticeProblems(sectionMarkdown) {
  if (!sectionMarkdown || !sectionMarkdown.trim()) return [];

  const text = sectionMarkdown.replace(/\r\n/g, '\n').trim();

  // Split by **Problem markers
  const pBlocks = text.split(/(?=[*][*]Problem)/);

  const items = [];
  for (const block of pBlocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('**Problem')) continue;

    let problem = trimmed;
    let hint = '';
    let solution = '';

    // Split on **Solution:**
    const solSplit = problem.split(/[*][*]Solution:?[*][*]\s*/);
    if (solSplit.length > 1) {
      problem = solSplit[0];
      solution = solSplit.slice(1).join('');
    }

    // Split remaining on **Hint:**
    const hintSplit = problem.split(/[*][*]Hint:?[*][*]\s*/);
    if (hintSplit.length > 1) {
      problem = hintSplit[0];
      hint = hintSplit.slice(1).join('');
    }

    // Clean the problem prefix
    problem = problem.replace(/^[*][*]Problem:?[*][*]\s*/, '').trim();

    hint = hint.trim();
    solution = solution.trim();

    if (problem) {
      items.push({ problem, hint, solution });
    }
  }

  return items;
}
