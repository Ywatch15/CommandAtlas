import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import { Bookmark } from '../models/Bookmark.js';
import { Note } from '../models/Note.js';
import { Session } from '../models/Session.js';

test('Server Mongoose Models Validation', async (t) => {
  await t.test('User schema contains required Mongoose paths', () => {
    const paths = User.schema.paths;
    assert.ok(paths.email, 'email field exists');
    assert.ok(paths.passwordHash, 'passwordHash field exists');
    assert.ok(paths.name, 'name field exists');
    assert.ok(paths.role, 'role field exists');
    assert.ok(paths.lastLoginAt, 'lastLoginAt field exists');
    assert.equal(paths.email.options.unique, true);
    assert.equal(paths.passwordHash.options.select, false);
  });

  await t.test('Bookmark schema contains required compound index', () => {
    const paths = Bookmark.schema.paths;
    assert.ok(paths.userId, 'userId field exists');
    assert.ok(paths.commandSlug, 'commandSlug field exists');
    const indexes = Bookmark.schema.indexes();
    const hasCompoundIndex = indexes.some(
      (idx) => idx[0].userId === 1 && idx[0].commandSlug === 1 && idx[1].unique === true
    );
    assert.ok(hasCompoundIndex, 'Compound unique index on {userId, commandSlug} exists');
  });

  await t.test('Note schema contains required plain text content & index', () => {
    const paths = Note.schema.paths;
    assert.ok(paths.userId, 'userId field exists');
    assert.ok(paths.commandSlug, 'commandSlug field exists');
    assert.ok(paths.content, 'content field exists');
    const indexes = Note.schema.indexes();
    const hasCompoundIndex = indexes.some((idx) => idx[0].userId === 1 && idx[0].commandSlug === 1);
    assert.ok(hasCompoundIndex, 'Compound index on {userId, commandSlug} exists');
  });

  await t.test('Session schema contains TTL index on expiresAt', () => {
    const paths = Session.schema.paths;
    assert.ok(paths.userId, 'userId field exists');
    assert.ok(paths.refreshToken, 'refreshToken field exists');
    assert.ok(paths.expiresAt, 'expiresAt field exists');
    assert.equal(paths.expiresAt.options.index.expires, 0);
  });
});
