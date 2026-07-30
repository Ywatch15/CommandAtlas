// Mongo/In-memory store for Bookmarks with compound unique index { userId, commandSlug }

const bookmarksStore = new Map(); // key: `${userId}:${commandSlug}`

export class Bookmark {
  static async findByUser(userId) {
    const results = [];
    for (const [key, val] of bookmarksStore.entries()) {
      if (key.startsWith(`${userId}:`)) {
        results.push(val);
      }
    }
    return results;
  }

  static async upsert({ userId, commandSlug, createdAt, updatedAt }) {
    const key = `${userId}:${commandSlug}`;
    const existing = bookmarksStore.get(key);
    const ts = updatedAt || createdAt || new Date().toISOString();

    if (!existing || new Date(ts) >= new Date(existing.updatedAt || existing.createdAt)) {
      const record = {
        userId,
        commandSlug,
        createdAt: existing ? existing.createdAt : createdAt || ts,
        updatedAt: ts,
      };
      bookmarksStore.set(key, record);
      return record;
    }
    return existing;
  }

  static async delete({ userId, commandSlug }) {
    const key = `${userId}:${commandSlug}`;
    bookmarksStore.delete(key);
  }
}
