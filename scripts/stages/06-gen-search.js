/**
 * 06-gen-search.js — Stage 06: Build inverted + trigram search indexes.
 */

import fs from 'fs/promises';
import path from 'path';
import { GLOBAL_SEARCH_INDEX_BUDGET_BYTES, FIELD_BOOST } from '../../packages/shared/constants.js';

export function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 0);
}

export function generateTrigrams(token) {
  if (!token || token.length < 2) return [];
  const padded = `^${token}$`;
  const trigrams = [];
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.push(padded.substring(i, i + 3));
  }
  return trigrams;
}

function addTokenToIndex(indexObj, token, slug, boost, isPhrase = false, fullPhrase = '') {
  if (!indexObj.tokens[token]) {
    indexObj.tokens[token] = [];
  }
  const existing = indexObj.tokens[token].find((entry) => entry.slug === slug);
  if (existing) {
    if (boost > existing.boost) {
      existing.boost = boost;
    }
  } else {
    const entry = { slug, boost };
    if (isPhrase) {
      entry.phrase = fullPhrase;
    }
    indexObj.tokens[token].push(entry);
  }

  // Trigrams for token
  const trigrams = generateTrigrams(token);
  for (const tri of trigrams) {
    if (!indexObj.trigrams[tri]) {
      indexObj.trigrams[tri] = [];
    }
    if (!indexObj.trigrams[tri].includes(token)) {
      indexObj.trigrams[tri].push(token);
    }
  }
}

export default async function genSearch(context, _options) {
  const searchDir = path.join(context.generatedDir, 'search-index');
  await fs.mkdir(searchDir, { recursive: true });

  const globalIndex = { tokens: {}, trigrams: {}, facets: {} };
  const perPackIndexes = new Map();

  for (const record of context.records) {
    if (record.type === 'category') continue;

    const slug = record.slug;
    const fm = record.frontmatter || {};
    const packId = (record.category || fm.category || '').split('/')[0] || 'global';

    if (!perPackIndexes.has(packId)) {
      perPackIndexes.set(packId, { tokens: {}, trigrams: {}, facets: {} });
    }
    const packIdx = perPackIndexes.get(packId);

    // Critical fields -> Global & Per-Pack
    // Name
    const nameTokens = tokenizeText(fm.name || slug);
    for (const t of nameTokens) {
      addTokenToIndex(globalIndex, t, slug, FIELD_BOOST.NAME);
      addTokenToIndex(packIdx, t, slug, FIELD_BOOST.NAME);
    }

    // Aliases
    const aliases = fm.aliases || (fm.alias ? [fm.alias] : []);
    for (const alias of aliases) {
      const aliasTokens = tokenizeText(alias);
      for (const t of aliasTokens) {
        addTokenToIndex(globalIndex, t, slug, FIELD_BOOST.ALIASES);
        addTokenToIndex(packIdx, t, slug, FIELD_BOOST.ALIASES);
      }
    }

    // Intent phrases
    const intentPhrases = fm.intentPhrases || [];
    for (const phrase of intentPhrases) {
      const phraseLower = phrase.toLowerCase().trim();
      const pTokens = tokenizeText(phrase);
      for (const t of pTokens) {
        addTokenToIndex(globalIndex, t, slug, FIELD_BOOST.INTENT_PHRASES, true, phraseLower);
        addTokenToIndex(packIdx, t, slug, FIELD_BOOST.INTENT_PHRASES, true, phraseLower);
      }
    }

    // High tier
    const tags = fm.tags || [];
    for (const tag of tags) {
      for (const t of tokenizeText(tag)) {
        addTokenToIndex(packIdx, t, slug, FIELD_BOOST.TAGS);
      }
    }

    const category = fm.category || record.category || '';
    for (const t of tokenizeText(category)) {
      addTokenToIndex(packIdx, t, slug, FIELD_BOOST.CATEGORY);
    }

    const flags = fm.flags || [];
    for (const flagObj of flags) {
      const flagStr = typeof flagObj === 'string' ? flagObj : flagObj.flag;
      for (const t of tokenizeText(flagStr)) {
        addTokenToIndex(packIdx, t, slug, FIELD_BOOST.FLAGS);
      }
    }

    // Medium tier
    const related = fm.relatedCommands || [];
    for (const rel of related) {
      for (const t of tokenizeText(rel)) {
        addTokenToIndex(packIdx, t, slug, FIELD_BOOST.RELATED_COMMANDS);
      }
    }

    // Low tier
    const summary = fm.summary || '';
    for (const t of tokenizeText(summary)) {
      addTokenToIndex(packIdx, t, slug, FIELD_BOOST.SUMMARY);
    }

    const body = record.body || '';
    for (const t of tokenizeText(body)) {
      addTokenToIndex(packIdx, t, slug, FIELD_BOOST.DESCRIPTION);
    }

    // Facets collection
    for (const idxOfChoice of [globalIndex, packIdx]) {
      if (!idxOfChoice.facets[slug]) {
        idxOfChoice.facets[slug] = {
          category: (fm.category || record.category || '').split('/')[0],
          difficulty: fm.difficulty,
          supportedOS: fm.supportedOS || [],
          tags: fm.tags || [],
        };
      }
    }
  }

  // Write global index
  const globalPath = path.join(searchDir, 'global.search-index.json');
  const globalJson = JSON.stringify(globalIndex);
  await fs.writeFile(globalPath, globalJson, 'utf-8');

  // Size check
  const rawSize = Buffer.byteLength(globalJson, 'utf-8');
  if (rawSize > GLOBAL_SEARCH_INDEX_BUDGET_BYTES) {
    const err = new Error(
      `Global search index exceeds ${GLOBAL_SEARCH_INDEX_BUDGET_BYTES / 1024}KB budget (raw: ${rawSize} bytes).`
    );
    err.isValidationError = true;
    err.failures = [{ file: globalPath, rule: 'global-index-budget', message: err.message }];
    throw err;
  }

  // Write per-pack indexes
  for (const [packId, packIdx] of perPackIndexes) {
    const packIdxPath = path.join(searchDir, `${packId}.search-index.json`);
    await fs.writeFile(packIdxPath, JSON.stringify(packIdx), 'utf-8');
  }

  context.searchIndexes = perPackIndexes;
  context.globalSearchIndex = globalIndex;
  process.stdout.write(` → search indexes generated (${perPackIndexes.size} pack(s))`);
}
