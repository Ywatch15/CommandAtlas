import { db } from './index.js';

export async function isBookmarked(commandSlug) {
  if (!commandSlug) return false;
  try {
    const item = await db.bookmarksLocal.get(commandSlug);
    return Boolean(item);
  } catch {
    return false;
  }
}

export async function toggleBookmark(commandSlug) {
  if (!commandSlug) return false;
  try {
    const existing = await db.bookmarksLocal.get(commandSlug);
    if (existing) {
      await db.bookmarksLocal.delete(commandSlug);
      return false;
    } else {
      await db.bookmarksLocal.put({
        commandSlug,
        createdAt: new Date().toISOString(),
        pendingSync: true,
      });
      return true;
    }
  } catch {
    return false;
  }
}

export async function getLocalBookmarks() {
  try {
    return await db.bookmarksLocal.toArray();
  } catch {
    return [];
  }
}

export async function getNote(commandSlug) {
  if (!commandSlug) return null;
  try {
    const note = await db.notesLocal.get(commandSlug);
    return note ? note.content : '';
  } catch {
    return '';
  }
}

export async function saveNote(commandSlug, content) {
  if (!commandSlug) return;
  try {
    const trimmed = (content || '').toString();
    if (!trimmed.trim()) {
      await db.notesLocal.delete(commandSlug);
    } else {
      await db.notesLocal.put({
        commandSlug,
        content: trimmed, // Plain text only per ADR-010
        updatedAt: new Date().toISOString(),
        pendingSync: true,
      });
    }
  } catch {
    /* fallback */
  }
}

export async function getLocalNotes() {
  try {
    return await db.notesLocal.toArray();
  } catch {
    return [];
  }
}
