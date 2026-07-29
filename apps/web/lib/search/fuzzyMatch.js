/**
 * fuzzyMatch.js — Damerau-Levenshtein edit distance & trigram pre-filtering.
 * ARCHITECTURE.md §9
 */

/**
 * Calculates Damerau-Levenshtein edit distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function damerauLevenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const lenA = a.length;
  const lenB = b.length;
  const matrix = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

  for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1); // transposition
      }
    }
  }

  return matrix[lenA][lenB];
}

/**
 * Generates trigrams for a token.
 * @param {string} token
 * @returns {string[]}
 */
export function getTrigrams(token) {
  if (!token || token.length < 2) return [];
  const padded = `^${token.toLowerCase()}$`;
  const res = [];
  for (let i = 0; i <= padded.length - 3; i++) {
    res.push(padded.substring(i, i + 3));
  }
  return res;
}

/**
 * Pre-filters candidates via trigram index and confirms with Damerau-Levenshtein.
 * Max allowed edit distance: 1 for short tokens (<=4 chars), 2 for longer tokens.
 * @param {string} queryToken
 * @param {Record<string, string[]>} trigramIndex - trigram => token[]
 * @param {string[]} indexedTokens - list of all known index tokens
 * @returns {string[]} matching index tokens
 */
export function findFuzzyCandidates(queryToken, trigramIndex, _indexedTokens) {
  if (!queryToken || queryToken.length < 3) return [];
  const qTrigrams = getTrigrams(queryToken);
  if (qTrigrams.length === 0) return [];

  // Count trigram overlap
  const tokenCounts = new Map();
  for (const tri of qTrigrams) {
    const tokens = trigramIndex[tri] || [];
    for (const t of tokens) {
      tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
    }
  }

  // Pre-filter tokens that share at least 1 trigram (or threshold)
  const maxDistance = queryToken.length <= 4 ? 1 : 2;
  const candidates = [];

  for (const [candidateToken, count] of tokenCounts.entries()) {
    // Quick length check
    if (Math.abs(candidateToken.length - queryToken.length) > maxDistance) continue;
    // Require at least min overlap
    if (count < Math.max(1, Math.floor(qTrigrams.length * 0.3))) continue;

    const dist = damerauLevenshteinDistance(queryToken.toLowerCase(), candidateToken.toLowerCase());
    if (dist > 0 && dist <= maxDistance) {
      candidates.push(candidateToken);
    }
  }

  return candidates;
}
