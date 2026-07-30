// Mongo/In-memory store for Notes with compound unique index { userId, commandSlug }

const notesStore = new Map(); // key: `${userId}:${commandSlug}`

export class Note {
  static async findByUser(userId) {
    const results = [];
    for (const [key, val] of notesStore.entries()) {
      if (key.startsWith(`${userId}:`)) {
        results.push(val);
      }
    }
    return results;
  }

  static async upsert({ userId, commandSlug, content, updatedAt }) {
    const key = `${userId}:${commandSlug}`;
    const existing = notesStore.get(key);
    const ts = updatedAt || new Date().toISOString();

    // Plain text only
    const cleanContent = (content || '').toString();

    if (!existing || new Date(ts) >= new Date(existing.updatedAt)) {
      const record = {
        userId,
        commandSlug,
        content: cleanContent,
        updatedAt: ts,
      };
      notesStore.set(key, record);
      return record;
    }
    return existing;
  }

  static async delete({ userId, commandSlug }) {
    const key = `${userId}:${commandSlug}`;
    notesStore.delete(key);
  }
}
