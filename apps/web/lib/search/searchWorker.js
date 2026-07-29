/**
 * searchWorker.js — Web Worker for search scoring when corpus > 500 commands.
 * ARCHITECTURE.md §9
 */

import { searchIndex } from './queryEngine.js';

let cachedIndex = null;

self.onmessage = function (e) {
  const { type, payload, id } = e.data;
  if (type === 'INIT') {
    cachedIndex = payload;
    self.postMessage({ type: 'INIT_DONE', id });
  } else if (type === 'SEARCH') {
    const { query, facets } = payload;
    const results = searchIndex(query, cachedIndex, facets);
    self.postMessage({ type: 'SEARCH_RESULTS', payload: results, id });
  }
};
