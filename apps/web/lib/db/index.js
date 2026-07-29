import Dexie from 'dexie';

export const db = new Dexie('commandatlas_db');

db.version(1).stores({
  commands: 'slug, category',
  workflows: 'slug, category',
  categories: 'slug, parent',
  tags: 'slug',
  learningPaths: 'slug',
  searchIndex: 'token',
  packs: 'packId',
  bookmarksLocal: 'commandSlug',
  notesLocal: 'commandSlug',
  meta: 'key',
});
