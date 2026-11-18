import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure DATABASE_URL is loaded from .env.local or apps/server/.env if not present in env
if (!process.env.DATABASE_URL) {
  const envPaths = [
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../../server/.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  }
}

import { prisma } from '../lib/prisma.js';
import { POST as signupHandler } from '../app/api/auth/signup/route.js';
import { POST as loginHandler } from '../app/api/auth/login/route.js';
import { GET as meHandler } from '../app/api/auth/me/route.js';
import { GET as healthHandler } from '../app/api/health/route.js';
import { POST as mergeHandler } from '../app/api/sync/merge/route.js';
import { POST as pushHandler } from '../app/api/sync/push/route.js';
import { GET as pullHandler } from '../app/api/sync/pull/route.js';

describe('Next.js API Routes — Auth & Health', () => {
  const testEmail = `test_runner_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  const testName = 'Test Automated User';
  let authToken = '';

  after(async () => {
    // Clean up test user
    try {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    } catch {
      // Ignore cleanup error
    }
  });

  test('GET /api/health — database connectivity', async () => {
    const res = await healthHandler();
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.db, 'connected');
  });

  test('POST /api/auth/signup — validation failure for short password', async () => {
    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: '123' }),
    });
    const res = await signupHandler(req);
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.match(data.error, /min 6 chars/);
  });

  test('POST /api/auth/signup — successfully registers new user', async () => {
    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
    });
    const res = await signupHandler(req);
    const data = await res.json();

    assert.equal(res.status, 201);
    assert.ok(data.token, 'Token must be returned');
    assert.equal(data.user.email, testEmail.toLowerCase());
    assert.equal(data.user.name, testName);
    assert.ok(data.user.id, 'User ID must be present');

    authToken = data.token;
  });

  test('POST /api/auth/signup — rejects duplicate email', async () => {
    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const res = await signupHandler(req);
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.match(data.error, /already exists/i);
  });

  test('POST /api/auth/login — rejects invalid credentials', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
    });
    const res = await loginHandler(req);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.match(data.error, /Invalid email or password/);
  });

  test('POST /api/auth/login — accepts valid credentials and returns token', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const res = await loginHandler(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(data.token, 'Login must return JWT token');
    assert.equal(data.user.email, testEmail.toLowerCase());
  });

  test('GET /api/auth/me — rejects unauthenticated request', async () => {
    const req = new Request('http://localhost/api/auth/me', {
      method: 'GET',
    });
    const res = await meHandler(req);
    assert.equal(res.status, 401);
  });

  test('GET /api/auth/me — returns user profile with valid Bearer token', async () => {
    const req = new Request('http://localhost/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const res = await meHandler(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.user.email, testEmail.toLowerCase());
    assert.equal(data.user.name, testName);
  });

  test('POST /api/sync/merge — merges local offline bookmarks and notes', async () => {
    const req = new Request('http://localhost/api/sync/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        localBookmarks: [{ commandSlug: 'git-commit' }, { commandSlug: 'docker-run' }],
        localNotes: [{ commandSlug: 'git-commit', content: 'My offline git commit note' }],
      }),
    });
    const res = await mergeHandler(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.mergedCount, 3);
  });

  test('GET /api/sync/pull — retrieves merged bookmarks and notes', async () => {
    const req = new Request('http://localhost/api/sync/pull', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const res = await pullHandler(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.bookmarks.length, 2);
    assert.equal(data.notes.length, 1);
    assert.equal(data.notes[0].commandSlug, 'git-commit');
    assert.equal(data.notes[0].content, 'My offline git commit note');
  });

  test('POST /api/sync/push — updates notes and syncs deletions', async () => {
    const req = new Request('http://localhost/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        bookmarks: [{ commandSlug: 'docker-run', deleted: true }],
        notes: [{ commandSlug: 'git-commit', content: 'Updated cloud note content' }],
      }),
    });
    const res = await pushHandler(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    // Verify via pull
    const verifyReq = new Request('http://localhost/api/sync/pull', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const verifyRes = await pullHandler(verifyReq);
    const verifyData = await verifyRes.json();

    assert.equal(verifyData.bookmarks.length, 1);
    assert.equal(verifyData.bookmarks[0].commandSlug, 'git-commit');
    assert.equal(verifyData.notes[0].content, 'Updated cloud note content');
  });
});
