'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar.jsx';
import SearchResultRow from './SearchResultRow.jsx';
import EmptySearchState from './EmptySearchState.jsx';
import { performSearch, loadSearchIndex } from '@/lib/search/index.js';
import { db } from '@/lib/db/index.js';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [commandsMap, setCommandsMap] = useState(new Map());
  const router = useRouter();

  useEffect(() => {
    loadSearchIndex();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open modal logic handled by parent or state trigger
          const event = new CustomEvent('open-search-modal');
          window.dispatchEvent(event);
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let isCurrent = true;
    async function runSearch() {
      const searchHits = await performSearch(query);
      if (!isCurrent) return;
      setResults(searchHits.slice(0, 10)); // Top 10 for modal overlay

      // Hydrate command metadata from Dexie / DB
      const slugs = searchHits.slice(0, 10).map((h) => h.slug);
      if (slugs.length > 0) {
        const localCmds = await db.commands.where('slug').anyOf(slugs).toArray();
        const map = new Map();
        for (const c of localCmds) map.set(c.slug, c);
        if (isCurrent) setCommandsMap(map);
      }
    }

    runSearch();
    return () => {
      isCurrent = false;
    };
  }, [query]);

  if (!isOpen) return null;

  const handleFullSearch = () => {
    onClose();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '80px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <SearchBar value={query} onChange={setQuery} autoFocus />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {results.length > 0 ? (
            results.map((hit) => {
              const cmdData = commandsMap.get(hit.slug) || {
                slug: hit.slug,
                name: hit.slug,
              };
              return <SearchResultRow key={hit.slug} command={cmdData} onClick={onClose} />;
            })
          ) : (
            <EmptySearchState query={query} />
          )}
        </div>

        {query.trim() && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-base)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            <span>Showing top {results.length} results</span>
            <button
              onClick={handleFullSearch}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              View all results on search page &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
