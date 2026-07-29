import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Parses markdown to sanitized HTML.
 * @param {string} markdown
 * @returns {string} Sanitized HTML string.
 */
export function parseAndSanitizeMarkdown(markdown) {
  if (!markdown) return '';
  const rawHtml = marked.parse(markdown, { gfm: true, breaks: true });
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
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
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
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
