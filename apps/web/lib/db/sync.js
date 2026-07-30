import { db } from './index.js';
import { getAuthToken } from '../auth.js';

export const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  AUTH_EXPIRED: 'auth_expired',
  OFFLINE: 'offline',
  ERROR: 'error',
};

let currentSyncStatus = SyncStatus.IDLE;
const listeners = new Set();
let retryTimeoutId = null;
let retryCount = 0;

export function getSyncStatus() {
  return currentSyncStatus;
}

export function subscribeSyncStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSyncStatus(status) {
  currentSyncStatus = status;
  listeners.forEach((fn) => fn(status));
}

// Account-Merge on First Login (ARCHITECTURE §7, ADR-009)
export async function performAccountMerge(token) {
  try {
    const localBookmarks = await db.bookmarksLocal.toArray();
    const localNotes = await db.notesLocal.toArray();

    if (localBookmarks.length === 0 && localNotes.length === 0) {
      return { mergedCount: 0 };
    }

    const res = await fetch('/api/sync/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-csrf-token': 'token_atlas_csrf_val',
      },
      body: JSON.stringify({ localBookmarks, localNotes }),
    });

    if (!res.ok) return { mergedCount: 0 };
    const data = await res.json();

    // Mark synced
    await db.transaction('rw', db.bookmarksLocal, db.notesLocal, async () => {
      for (const bm of localBookmarks) {
        await db.bookmarksLocal.update(bm.commandSlug, { pendingSync: false });
      }
      for (const n of localNotes) {
        await db.notesLocal.update(n.commandSlug, { pendingSync: false });
      }
    });

    return data;
  } catch {
    return { mergedCount: 0 };
  }
}

// Full Sync (Push + Pull with Backoff & Expired Token handling)
export async function triggerSync() {
  const token = getAuthToken();

  // If no auth token, local-only offline mode
  if (!token) {
    setSyncStatus(SyncStatus.IDLE);
    return;
  }

  // Network check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncStatus(SyncStatus.OFFLINE);
    return;
  }

  setSyncStatus(SyncStatus.SYNCING);

  try {
    const pendingBookmarks = await db.bookmarksLocal
      .where('pendingSync')
      .equals(1)
      .or('pendingSync')
      .equals(true)
      .toArray();

    const pendingNotes = await db.notesLocal
      .where('pendingSync')
      .equals(1)
      .or('pendingSync')
      .equals(true)
      .toArray();

    // 1. Push pending local changes
    const pushRes = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-csrf-token': 'token_atlas_csrf_val',
      },
      body: JSON.stringify({
        bookmarks: pendingBookmarks,
        notes: pendingNotes,
      }),
    });

    if (pushRes.status === 401) {
      // ARCHITECTURE §7: Expired token during offline sync -> preserve pending data, prompt re-auth, pause retry
      setSyncStatus(SyncStatus.AUTH_EXPIRED);
      return;
    }

    if (!pushRes.ok) {
      scheduleRetry();
      return;
    }

    // Mark pending local changes synced
    await db.transaction('rw', db.bookmarksLocal, db.notesLocal, async () => {
      for (const bm of pendingBookmarks) {
        await db.bookmarksLocal.update(bm.commandSlug, { pendingSync: false });
      }
      for (const n of pendingNotes) {
        await db.notesLocal.update(n.commandSlug, { pendingSync: false });
      }
    });

    // 2. Pull remote changes (last-write-wins)
    const pullRes = await fetch('/api/sync/pull', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (pullRes.ok) {
      const { bookmarks = [], notes = [] } = await pullRes.json();

      await db.transaction('rw', db.bookmarksLocal, db.notesLocal, async () => {
        for (const bm of bookmarks) {
          const local = await db.bookmarksLocal.get(bm.commandSlug);
          if (!local) {
            await db.bookmarksLocal.put({
              commandSlug: bm.commandSlug,
              createdAt: bm.createdAt,
              pendingSync: false,
            });
          }
        }

        for (const note of notes) {
          const local = await db.notesLocal.get(note.commandSlug);
          if (!local || new Date(note.updatedAt) > new Date(local.updatedAt)) {
            await db.notesLocal.put({
              commandSlug: note.commandSlug,
              content: note.content,
              updatedAt: note.updatedAt,
              pendingSync: false,
            });
          }
        }
      });
    }

    retryCount = 0;
    setSyncStatus(SyncStatus.SUCCESS);
  } catch {
    scheduleRetry();
  }
}

function scheduleRetry() {
  setSyncStatus(SyncStatus.ERROR);
  if (retryCount > 5) return; // Cap retries
  const backoff = Math.min(1000 * 2 ** retryCount, 30000);
  retryCount++;
  if (retryTimeoutId) clearTimeout(retryTimeoutId);
  retryTimeoutId = setTimeout(() => {
    triggerSync();
  }, backoff);
}
