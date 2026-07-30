'use client';
import { useState, useEffect } from 'react';
import { isBookmarked, toggleBookmark } from '@/lib/db/user-data.js';

export default function BookmarkButton({ commandSlug }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!commandSlug) return;
      const status = await isBookmarked(commandSlug);
      if (mounted) {
        setBookmarked(status);
        setLoading(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [commandSlug]);

  async function handleToggle() {
    if (loading || !commandSlug) return;
    const nextState = await toggleBookmark(commandSlug);
    setBookmarked(nextState);
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark command'}
      title={bookmarked ? 'Bookmarked (click to remove)' : 'Bookmark command'}
      style={{
        backgroundColor: 'var(--bg-elevated)',
        color: bookmarked ? 'var(--warning)' : 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '4px',
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'border-color 0.15s ease, color 0.15s ease',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </button>
  );
}
