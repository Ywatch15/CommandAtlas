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
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

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
  const sections = {};
  const regex = /^##\s+(.+)$/gm;
  let match;
  const indices = [];
  while ((match = regex.exec(body)) !== null) {
    indices.push({
      title: match[1].trim(),
      index: match.index,
      headerLength: match[0].length,
    });
  }

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index + indices[i].headerLength;
    const end = i < indices.length - 1 ? indices[i + 1].index : body.length;
    const content = body.substring(start, end).trim();
    sections[indices[i].title] = content;
  }
  return sections;
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
