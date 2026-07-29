'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell.jsx';
import SearchBar from '@/components/search/SearchBar.jsx';
import SearchResultRow from '@/components/search/SearchResultRow.jsx';
import EmptySearchState from '@/components/search/EmptySearchState.jsx';
import FacetSidebar from '@/components/search/FacetSidebar.jsx';
import { performSearch, loadSearchIndex } from '@/lib/search/index.js';
import { db } from '@/lib/db/index.js';

export default function SearchPageClient({ staticAllCategories = [] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [facets, setFacets] = useState({
    category: null,
    difficulty: null,
    supportedOS: null,
  });

  const [results, setResults] = useState([]);
  const [commandsMap, setCommandsMap] = useState(new Map());

  useEffect(() => {
    loadSearchIndex();
  }, []);

  // Update query when URL searchParams change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
  }, [searchParams]);

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery) {
      params.set('q', newQuery);
    } else {
      params.delete('q');
    }
    router.replace(`/search?${params.toString()}`);
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let isCurrent = true;
    async function runSearch() {
      const hits = await performSearch(query, facets);
      if (!isCurrent) return;
      setResults(hits);

      // Hydrate metadata from Dexie or fallback
      const slugs = hits.map((h) => h.slug);
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
  }, [query, facets]);

  return (
    <AppShell>
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 500,
              marginBottom: '16px',
              color: 'var(--text-primary)',
            }}
          >
            Search Commands
          </h1>
          <SearchBar value={query} onChange={handleQueryChange} />
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <FacetSidebar
            facets={facets}
            onFacetChange={setFacets}
            categories={staticAllCategories}
          />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.length > 0 ? (
              results.map((hit) => {
                const cmdData = commandsMap.get(hit.slug) || {
                  slug: hit.slug,
                  name: hit.slug,
                };
                return <SearchResultRow key={hit.slug} command={cmdData} />;
              })
            ) : (
              <EmptySearchState query={query} />
            )}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
