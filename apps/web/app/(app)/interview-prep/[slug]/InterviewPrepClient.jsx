'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import SortFilterBar from '@/components/common/SortFilterBar.jsx';
import QACard from '@/components/common/QACard.jsx';
import { parseBodySections, parseInterviewQuestions } from '@/lib/markdown.js';

export default function InterviewPrepClient({
  currentSlug,
  staticAllCommands,
  staticAllCategories,
}) {
  const [allCommands, setAllCommands] = useState(staticAllCommands);
  const [allCategories, setAllCategories] = useState(staticAllCategories);
  const [openItems, setOpenItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('topic');
  const [selectedDifficulties, setSelectedDifficulties] = useState(new Set());

  useEffect(() => {
    async function loadLocal() {
      try {
        const localCmds = await db.commands.toArray();
        const localCats = await db.categories.toArray();
        if (localCmds.length > 0) setAllCommands(localCmds);
        if (localCats.length > 0) setAllCategories(localCats);
      } catch {
        /* fallback */
      }
    }
    loadLocal();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sortParam = params.get('sort');
      if (
        sortParam &&
        ['topic', 'name-asc', 'name-desc', 'diff-asc', 'diff-desc'].includes(sortParam)
      ) {
        setSortBy(sortParam);
      }
    }
  }, []);

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('sort', newSort);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const toggleDifficultyFilter = (diff) => {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(diff)) {
        next.delete(diff);
      } else {
        next.add(diff);
      }
      return next;
    });
  };

  const sidebarItems = (allCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  // Filter commands by category if currentSlug !== 'all'
  const filteredCommands =
    currentSlug === 'all'
      ? allCommands
      : allCommands.filter(
          (c) => (c.frontmatter?.category || c.category || '').split('/')[0] === currentSlug
        );

  const DIFFICULTY_RANK = { beginner: 1, intermediate: 2, advanced: 3 };

  // Parse and filter matching interview questions
  const allMatchingItems = [];
  for (const cmd of filteredCommands) {
    const diff = (cmd.frontmatter?.difficulty || 'intermediate').toLowerCase();
    if (selectedDifficulties.size > 0 && !selectedDifficulties.has(diff)) {
      continue;
    }

    const sections = parseBodySections(cmd.body || '');
    const iq = sections['Interview Questions'];
    if (iq && iq.trim() && !iq.includes('Not applicable')) {
      const catKey = (cmd.frontmatter?.category || cmd.category || 'other').split('/')[0];
      const pairs = parseInterviewQuestions(iq);
      if (pairs.length > 0) {
        allMatchingItems.push({ cmd, pairs, catKey, diff });
      }
    }
  }

  // Pre-calculate grouped and flat items based on sortBy
  const isGroupedByTopic = sortBy === 'topic';

  // Topic grouping
  const grouped = {};
  if (isGroupedByTopic) {
    for (const item of allMatchingItems) {
      if (!grouped[item.catKey]) grouped[item.catKey] = [];
      grouped[item.catKey].push(item);
    }
    // Sort items alphabetically within each topic group
    for (const catKey of Object.keys(grouped)) {
      grouped[catKey].sort((a, b) => {
        const nameA = (a.cmd.frontmatter?.name || a.cmd.slug).toLowerCase();
        const nameB = (b.cmd.frontmatter?.name || b.cmd.slug).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
  }

  // Flat sorted items
  const sortedFlatItems = [...allMatchingItems].sort((a, b) => {
    if (sortBy === 'name-asc') {
      const nameA = (a.cmd.frontmatter?.name || a.cmd.slug).toLowerCase();
      const nameB = (b.cmd.frontmatter?.name || b.cmd.slug).toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (sortBy === 'name-desc') {
      const nameA = (a.cmd.frontmatter?.name || a.cmd.slug).toLowerCase();
      const nameB = (b.cmd.frontmatter?.name || b.cmd.slug).toLowerCase();
      return nameB.localeCompare(nameA);
    }
    if (sortBy === 'diff-asc') {
      const diffA = DIFFICULTY_RANK[a.diff] || 2;
      const diffB = DIFFICULTY_RANK[b.diff] || 2;
      if (diffA !== diffB) return diffA - diffB;
      const nameA = (a.cmd.frontmatter?.name || a.cmd.slug).toLowerCase();
      const nameB = (b.cmd.frontmatter?.name || b.cmd.slug).toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (sortBy === 'diff-desc') {
      const diffA = DIFFICULTY_RANK[a.diff] || 2;
      const diffB = DIFFICULTY_RANK[b.diff] || 2;
      if (diffA !== diffB) return diffB - diffA;
      const nameA = (a.cmd.frontmatter?.name || a.cmd.slug).toLowerCase();
      const nameB = (b.cmd.frontmatter?.name || b.cmd.slug).toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  const singleMatchingSlug = allMatchingItems.length === 1 ? allMatchingItems[0].cmd.slug : null;

  // Auto-expand first item if only 1 item matches
  useEffect(() => {
    if (singleMatchingSlug) {
      setOpenItems(new Set([singleMatchingSlug]));
    }
  }, [singleMatchingSlug]);

  const toggleItem = (slug) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const expandAllGlobal = () => {
    const allSlugs = new Set();
    allMatchingItems.forEach(({ cmd }) => allSlugs.add(cmd.slug));
    setOpenItems(allSlugs);
  };

  const collapseAllGlobal = () => {
    setOpenItems(new Set());
  };

  const categorySlugs = ['all', ...(allCategories || []).map((c) => c.slug)];

  const renderCard = ({ cmd, pairs }) => (
    <QACard
      key={cmd.slug}
      mode="interview"
      title={cmd.frontmatter?.name || cmd.name || cmd.slug}
      commandSlug={cmd.slug}
      difficulty={cmd.frontmatter?.difficulty || 'intermediate'}
      isOpen={openItems.has(cmd.slug)}
      onToggle={() => toggleItem(cmd.slug)}
      qaPairs={pairs}
    />
  );

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--accent)',
            }}
          >
            Technical Assessment & Preparation
          </span>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: '4px',
              marginBottom: '8px',
            }}
          >
            Terminal & System Interview Prep
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Real-world interview questions, architectural trade-offs, and scenario assessments
            grouped by topic.
          </p>
        </div>

        {/* Topic Bar: horizontally scrollable single row below 768px, no wrapping */}
        <div className="topic-bar">
          <span className="topic-label">Filter Topic:</span>
          <div className="topic-pills">
            {categorySlugs.map((slug) => {
              const isActive = slug === currentSlug;
              return (
                <Link
                  key={slug}
                  href={`/interview-prep/${slug}`}
                  className={`topic-pill ${isActive ? 'active' : ''}`}
                >
                  {slug}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Global Filter/Sort Bar */}
        <SortFilterBar
          sortBy={sortBy}
          onSortChange={handleSortChange}
          selectedDifficulties={selectedDifficulties}
          onToggleDifficulty={toggleDifficultyFilter}
          onExpandAll={expandAllGlobal}
          onCollapseAll={collapseAllGlobal}
        />

        {/* Content Grouped by Topic or Flat List */}
        {allMatchingItems.length === 0 ? (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            No interview questions found for this filter.
          </div>
        ) : isGroupedByTopic ? (
          Object.entries(grouped).map(([topic, items]) => (
            <div key={topic} style={{ marginBottom: '40px' }}>
              <div className="topic-section-header">
                <h2 className="topic-title">{topic}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map(renderCard)}
              </div>
            </div>
          ))
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}
          >
            {sortedFlatItems.map(renderCard)}
          </div>
        )}
      </div>

      <style jsx>{`
        .topic-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .topic-bar::-webkit-scrollbar {
          display: none;
        }

        .topic-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Single row horizontally scrollable, never wrap into tall pill wall */
        .topic-pills {
          display: flex;
          gap: 6px;
          flex-wrap: nowrap;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .topic-pills::-webkit-scrollbar {
          display: none;
        }

        :global(.topic-pill) {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 4px;
          text-decoration: none !important;
          text-transform: capitalize;
          background-color: transparent;
          color: var(--text-muted) !important;
          border: 1px solid transparent;
          white-space: nowrap;
          flex-shrink: 0;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s ease;
        }

        :global(.topic-pill:hover) {
          color: var(--text-primary) !important;
          background-color: var(--bg-surface) !important;
        }

        :global(.topic-pill.active) {
          background-color: var(--bg-elevated) !important;
          color: var(--text-primary) !important;
          border-color: var(--border-subtle) !important;
        }

        .topic-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 8px;
        }

        .topic-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--accent);
          text-transform: capitalize;
          margin: 0;
        }

        @media (max-width: 768px) {
          .topic-bar {
            gap: 8px;
            padding-bottom: 10px;
          }
        }
      `}</style>
    </AppShell>
  );
}
