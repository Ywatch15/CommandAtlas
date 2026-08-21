'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { getLocalNotes, saveNote } from '@/lib/db/user-data.js';
import { db } from '@/lib/db/index.js';

import EmptyState from '@/components/common/EmptyState.jsx';

export default function NotesPageClient({ staticAllCategories }) {
  const [notes, setNotes] = useState([]);
  const [commands, setCommands] = useState([]);
  const [allCategories, setAllCategories] = useState(staticAllCategories || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const localNotes = await getLocalNotes();
        setNotes(localNotes);

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

  async function handleDelete(slug) {
    await saveNote(slug, '');
    setNotes((prev) => prev.filter((n) => n.commandSlug !== slug));
  }

  const sidebarItems = allCategories.map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const noteSlugs = new Set(notes.map((n) => n.commandSlug));
  const noteCommands = commands.filter((c) => noteSlugs.has(c.slug));

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
          My Notes
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Personal notes stored locally on your device (plain text only, per ADR-010).
        </p>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading notes...</p>
        ) : notes.length === 0 ? (
          <EmptyState
            title="No Saved Notes"
            message="Add notes on any command reference page to store personal annotations and cheat sheets locally."
            actionLabel="Browse Commands"
            href="/"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notes.map((note) => {
              const cmd = noteCommands.find((c) => c.slug === note.commandSlug);
              return (
                <div
                  key={note.commandSlug}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <Link
                      href={`/command/${note.commandSlug}`}
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--accent)',
                        textDecoration: 'none',
                      }}
                    >
                      {cmd?.frontmatter?.name || note.commandSlug}
                    </Link>
                    <button
                      onClick={() => handleDelete(note.commandSlug)}
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
                      Delete Note
                    </button>
                  </div>

                  {/* ADR-010: Renders plain text only in pre-wrap container — no Markdown/HTML execution */}
                  <pre
                    style={{
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      backgroundColor: 'var(--bg-elevated)',
                      padding: '12px',
                      borderRadius: '4px',
                      margin: 0,
                    }}
                  >
                    {note.content}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
