/**
 * queryEngine.js — Deterministic, field-weighted, rule-based search engine.
 * ARCHITECTURE.md §9
 */

import { MATCH_TYPE_MULTIPLIER } from '@commandatlas/shared/constants.js';
import { findFuzzyCandidates } from './fuzzyMatch.js';

/**
 * Tokenizes search query.
 * @param {string} rawQuery
 * @returns {string[]}
 */
export function tokenizeQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return [];
  return rawQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 0);
}

/**
 * Executes a search query against a pre-built search index object.
 *
 * @param {string} rawQuery - raw text query
 * @param {object} indexData - pre-built index JSON { tokens, trigrams, facets }
 * @param {object} [facetsFilter] - { category, difficulty, supportedOS, tags }
 * @returns {Array<{ slug: string, score: number }>} ranked search results
 */
export function searchIndex(rawQuery, indexData, facetsFilter = null) {
  if (!rawQuery || !indexData || !indexData.tokens) return [];

  const queryClean = rawQuery.trim().toLowerCase();
  const queryTokens = tokenizeQuery(rawQuery);
  if (queryTokens.length === 0) return [];

  const scores = new Map(); // slug => score

  const allIndexTokens = Object.keys(indexData.tokens);
  const trigramIdx = indexData.trigrams || {};

  for (const qToken of queryTokens) {
    // 1. Exact match lookups
    const exactEntries = indexData.tokens[qToken];
    if (exactEntries && Array.isArray(exactEntries)) {
      for (const entry of exactEntries) {
        let mult = MATCH_TYPE_MULTIPLIER.EXACT;
        // Check for full phrase exact match bonus
        if (entry.phrase && entry.phrase === queryClean) {
          mult *= MATCH_TYPE_MULTIPLIER.INTENT_PHRASE_EXACT;
        }
        const scoreInc = entry.boost * mult;
        scores.set(entry.slug, (scores.get(entry.slug) || 0) + scoreInc);
      }
    }

    // 2. Prefix match lookups (if qToken length >= 2)
    if (qToken.length >= 2) {
      for (const idxToken of allIndexTokens) {
        if (idxToken !== qToken && idxToken.startsWith(qToken)) {
          const prefixEntries = indexData.tokens[idxToken];
          for (const entry of prefixEntries) {
            const scoreInc = entry.boost * MATCH_TYPE_MULTIPLIER.PREFIX;
            scores.set(entry.slug, (scores.get(entry.slug) || 0) + scoreInc);
          }
        }
      }
    }

    // 3. Fuzzy match lookups (if qToken length >= 3 and no exact matches found or secondary candidate)
    const fuzzyCandidateTokens = findFuzzyCandidates(qToken, trigramIdx, allIndexTokens);
    for (const fuzzyToken of fuzzyCandidateTokens) {
      const fuzzyEntries = indexData.tokens[fuzzyToken];
      if (fuzzyEntries) {
        for (const entry of fuzzyEntries) {
          const scoreInc = entry.boost * MATCH_TYPE_MULTIPLIER.FUZZY;
          scores.set(entry.slug, (scores.get(entry.slug) || 0) + scoreInc);
        }
      }
    }
  }

  // Convert scores to array
  let results = [];
  for (const [slug, score] of scores.entries()) {
    results.push({ slug, score });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Apply Facets filtering via Set intersection (applied AFTER scoring, never affects score)
  if (facetsFilter && indexData.facets) {
    results = results.filter((item) => {
      const metadata = indexData.facets[item.slug];
      if (!metadata) return true;

      if (facetsFilter.category && metadata.category !== facetsFilter.category) {
        return false;
      }
      if (facetsFilter.difficulty && metadata.difficulty !== facetsFilter.difficulty) {
        return false;
      }
      if (
        facetsFilter.supportedOS &&
        facetsFilter.supportedOS.length > 0 &&
        !facetsFilter.supportedOS.some((os) => (metadata.supportedOS || []).includes(os))
      ) {
        return false;
      }
      if (
        facetsFilter.tags &&
        facetsFilter.tags.length > 0 &&
        !facetsFilter.tags.some((tag) => (metadata.tags || []).includes(tag))
      ) {
        return false;
      }

      return true;
    });
  }

  return results;
}
