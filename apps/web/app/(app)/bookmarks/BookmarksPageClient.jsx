'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { getLocalBookmarks, toggleBookmark } from '@/lib/db/user-data.js';
import { db } from '@/lib/db/index.js';

import EmptyState from '@/components/common/EmptyState.jsx';

export default function BookmarksPageClient({ staticAllCategories }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [commands, setCommands] = useState([]);
  const [allCategories, setAllCategories] = useState(staticAllCategories || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const bms = await getLocalBookmarks();
        setBookmarks(bms);

        const localCmds = await db.commands.toArray();
        setCommands(localCmds);

        const localCats = await db.categories.toArray();
        if (localCats.length > 0) setAllCategories(localCats);
      } catch {
        /* fallback */
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleRemove(slug) {
    await toggleBookmark(slug);
    setBookmarks((prev) => prev.filter((b) => b.commandSlug !== slug));
  }

  const sidebarItems = allCategories.map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const bookmarkedSlugs = new Set(bookmarks.map((b) => b.commandSlug));
  const bookmarkedCommands = commands.filter((c) => bookmarkedSlugs.has(c.slug));

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Bookmarked Commands
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Saved locally on your device. Works fully offline without an account.
        </p>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading bookmarks...</p>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            title="No Bookmarked Commands"
            message="Click 'Bookmark' on any command reference page to save it here for quick offline access."
            actionLabel="Explore Categories"
            href="/"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookmarks.map((bm) => {
              const cmd = bookmarkedCommands.find((c) => c.slug === bm.commandSlug);
              return (
                <div
                  key={bm.commandSlug}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '12px 16px',
                  }}
                >
                  <div>
                    <Link
                      href={`/command/${bm.commandSlug}`}
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--accent)',
                        textDecoration: 'none',
                      }}
                    >
                      {cmd?.frontmatter?.name || bm.commandSlug}
                    </Link>
                    {cmd?.frontmatter?.category && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginLeft: '12px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {cmd.frontmatter.category}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemove(bm.commandSlug)}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--danger)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
