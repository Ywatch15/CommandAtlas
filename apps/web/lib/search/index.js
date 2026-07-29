/**
 * index.js — Search Coordinator and Client API.
 * ARCHITECTURE.md §9
 */

import { SEARCH_WEB_WORKER_THRESHOLD } from '@commandatlas/shared/constants.js';
import { searchIndex } from './queryEngine.js';

let indexData = null;
let searchWorker = null;
let totalCommandsCount = 0;
let workerInitPromise = null;
let msgSeq = 0;
const pendingWorkerRequests = new Map();

/**
 * Loads the pre-built global search index (and optionally pack search indexes).
 */
export async function loadSearchIndex() {
  if (indexData) return indexData;
  try {
    const res = await fetch('/search-index/global.search-index.json');
    if (!res.ok) throw new Error('Failed to load global search index');
    indexData = await res.json();
    totalCommandsCount = indexData.facets ? Object.keys(indexData.facets).length : 0;

    // Check if worker offload is needed (> 500 commands threshold)
    if (
      totalCommandsCount > SEARCH_WEB_WORKER_THRESHOLD &&
      typeof window !== 'undefined' &&
      window.Worker
    ) {
      initWorker();
    }
  } catch (err) {
    console.error('Search index load error:', err);
    indexData = { tokens: {}, trigrams: {}, facets: {} };
  }
  return indexData;
}

function initWorker() {
  if (searchWorker) return;
  try {
    searchWorker = new Worker(new URL('./searchWorker.js', import.meta.url), { type: 'module' });
    searchWorker.onmessage = (e) => {
      const { payload, id } = e.data;
      if (pendingWorkerRequests.has(id)) {
        const resolve = pendingWorkerRequests.get(id);
        pendingWorkerRequests.delete(id);
        resolve(payload);
      }
    };
    workerInitPromise = new Promise((resolve) => {
      const reqId = ++msgSeq;
      pendingWorkerRequests.set(reqId, resolve);
      searchWorker.postMessage({ type: 'INIT', payload: indexData, id: reqId });
    });
  } catch {
    searchWorker = null;
  }
}

/**
 * Executes a search query either on main thread or via Web Worker depending on corpus size threshold.
 *
 * @param {string} query
 * @param {object} [facets]
 * @returns {Promise<Array<{ slug: string, score: number }>>}
 */
export async function performSearch(query, facets = null) {
  if (!query || !query.trim()) return [];
  if (!indexData) {
    await loadSearchIndex();
  }

  const isAboveThreshold = totalCommandsCount > SEARCH_WEB_WORKER_THRESHOLD;

  if (isAboveThreshold && searchWorker) {
    if (workerInitPromise) await workerInitPromise;
    return new Promise((resolve) => {
      const reqId = ++msgSeq;
      pendingWorkerRequests.set(reqId, resolve);
      searchWorker.postMessage({
        type: 'SEARCH',
        payload: { query, facets },
        id: reqId,
      });
    });
  }

  // Main thread search (<= 500 commands)
  return searchIndex(query, indexData, facets);
}
