'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import {
  parseBodySections,
  parseInterviewQuestions,
  parseAndSanitizeMarkdown,
} from '@/lib/markdown.js';

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

  const sidebarItems = allCategories.map((cat) => ({
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

  // Sort function
  const sortItems = (items) => {
    return [...items].sort((a, b) => {
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
      // Topic tie-breaker
      const nameA = (a.cmd.frontmatter?.name || a.cmd.slug).toLowerCase();
      const nameB = (b.cmd.frontmatter?.name || b.cmd.slug).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  // Group by topic if sortBy === 'topic', otherwise flat list
  const isGroupedByTopic = sortBy === 'topic';
  const grouped = {};
  if (isGroupedByTopic) {
    for (const item of allMatchingItems) {
      if (!grouped[item.catKey]) grouped[item.catKey] = [];
      grouped[item.catKey].push(item);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key] = sortItems(grouped[key]);
    }
  }

  const sortedFlatItems = !isGroupedByTopic ? sortItems(allMatchingItems) : [];

  // Automatically open first 3 questions on initial render
  useEffect(() => {
    const initialOpen = new Set();
    if (isGroupedByTopic) {
      Object.values(grouped).forEach((items) => {
        items.slice(0, 3).forEach(({ cmd }) => initialOpen.add(cmd.slug));
      });
    } else {
      sortedFlatItems.slice(0, 3).forEach(({ cmd }) => initialOpen.add(cmd.slug));
    }
    setOpenItems(initialOpen);
  }, [currentSlug, allCommands.length, sortBy, selectedDifficulties.size]);

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

  const categorySlugs = ['all', ...allCategories.map((c) => c.slug)];

  const renderCard = ({ cmd, pairs }) => {
    const isOpen = openItems.has(cmd.slug);
    const difficulty = cmd.frontmatter?.difficulty || 'intermediate';
    return (
      <div key={cmd.slug} className={`accordion-card ${isOpen ? 'open' : ''}`}>
        <div
          className="accordion-header"
          onClick={() => toggleItem(cmd.slug)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleItem(cmd.slug);
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={isOpen}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              minWidth: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
                flexShrink: 0,
                color: 'var(--text-muted)',
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {cmd.frontmatter?.name || cmd.name || cmd.slug}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`badge-difficulty difficulty-${difficulty}`}>{difficulty}</span>
            <Link
              href={`/command/${cmd.slug}`}
              className="cmd-ref-link"
              onClick={(e) => e.stopPropagation()}
            >
              Ref &rarr;
            </Link>
          </div>
        </div>

        {isOpen && (
          <div className="accordion-body">
            {pairs.map((pair, idx) => (
              <div key={idx} className="iq-pair">
                <div className="iq-question-block">
                  <span className="iq-q-prefix">Q:</span>
                  <span className="iq-q-text">{pair.question}</span>
                </div>
                <div className="iq-answer-block">
                  <span className="iq-a-prefix">A:</span>
                  <div
                    className="iq-a-text"
                    dangerouslySetInnerHTML={{
                      __html: parseAndSanitizeMarkdown(pair.answer),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
            Interview Question Bank
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Real-world interview questions, architectural trade-offs, and scenario assessments
            grouped by topic.
          </p>
        </div>

        {/* Topic Bar */}
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
        <div className="interview-actions-bar">
          <div className="filter-sort-controls">
            <div className="sort-control">
              <label htmlFor="sort-select" className="sort-label">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="sort-select"
              >
                <option value="topic">Topic (Grouped)</option>
                <option value="name-asc">Name (A–Z)</option>
                <option value="name-desc">Name (Z–A)</option>
                <option value="diff-asc">Difficulty (Beginner → Advanced)</option>
                <option value="diff-desc">Difficulty (Advanced → Beginner)</option>
              </select>
            </div>

            <div className="diff-filter-group">
              <span className="sort-label">Difficulty:</span>
              <div className="difficulty-chips">
                {['beginner', 'intermediate', 'advanced'].map((diff) => {
                  const isActive = selectedDifficulties.has(diff);
                  return (
                    <button
                      key={diff}
                      type="button"
                      className={`diff-chip ${isActive ? 'active' : ''}`}
                      onClick={() => toggleDifficultyFilter(diff)}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="global-expand-controls">
            <button type="button" className="action-link-btn" onClick={expandAllGlobal}>
              Expand All
            </button>
            <span style={{ color: 'var(--border-subtle)' }}>|</span>
            <button type="button" className="action-link-btn" onClick={collapseAllGlobal}>
              Collapse All
            </button>
          </div>
        </div>

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
          margin-bottom: 28px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
          overflow-x: auto;
        }

        .topic-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .topic-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        :global(.topic-pill) {
          font-size: 13px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 4px;
          text-decoration: none !important;
          text-transform: capitalize;
          background-color: transparent;
          color: var(--text-muted) !important;
          border: 1px solid transparent;
          white-space: nowrap;
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

        .action-link-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
        }

        .action-link-btn:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }

        .accordion-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          overflow: hidden;
          transition: border-color 0.15s ease;
        }

        .accordion-card.open {
          border-color: var(--border-subtle);
        }

        .accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          cursor: pointer;
          background-color: var(--bg-surface);
          user-select: none;
        }

        .accordion-header:hover {
          background-color: var(--bg-elevated);
        }

        .cmd-title-name {
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
          color: var(--text-primary);
        }

        .badge-difficulty {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 3px 8px;
          border-radius: 3px;
        }

        .difficulty-beginner {
          background-color: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .difficulty-intermediate {
          background-color: rgba(234, 179, 8, 0.15);
          color: #facc15;
        }

        .difficulty-advanced {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        :global(.cmd-ref-link) {
          font-size: 12px;
          color: var(--accent) !important;
          text-decoration: none !important;
        }

        :global(.cmd-ref-link:hover) {
          text-decoration: underline !important;
        }

        .accordion-body {
          padding: 16px 20px 20px 20px;
          border-top: 1px solid var(--border-subtle);
          background-color: var(--bg-base);
        }

        :global(.iq-pair) {
          margin-bottom: 20px;
        }
        :global(.iq-pair:last-child) {
          margin-bottom: 0;
        }

        :global(.iq-question-block) {
          font-size: 15px;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        :global(.iq-q-prefix) {
          color: var(--accent);
          font-weight: 700;
          margin-right: 6px;
        }

        :global(.iq-q-text) {
          color: var(--text-primary);
          font-weight: 600;
        }

        :global(.iq-answer-block) {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          border-left: 2px solid var(--border-subtle);
          padding-left: 12px;
          margin-left: 2px;
        }

        :global(.iq-a-prefix) {
          color: var(--text-muted);
          font-weight: 700;
          flex-shrink: 0;
        }

        :global(.iq-a-text) {
          font-size: 14px;
          font-weight: 400;
          color: var(--text-primary);
          line-height: 1.6;
          flex: 1;
        }

        :global(.iq-a-text p) {
          margin: 0 0 8px 0;
        }
        :global(.iq-a-text p:last-child) {
          margin: 0;
        }

        .interview-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .sort-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
        }

        .sort-select {
          background-color: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 5px 28px 5px 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          transition: border-color 0.15s ease;
        }

        .sort-select:hover {
          border-color: var(--text-muted);
        }

        .sort-select:focus-visible {
          border-color: var(--accent);
          outline: 2px solid var(--accent);
          outline-offset: -1px;
        }

        .global-expand-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-sort-controls {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .diff-filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .difficulty-chips {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .diff-chip {
          background-color: var(--bg-surface);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .diff-chip:hover {
          color: var(--text-primary);
          border-color: var(--text-muted);
        }

        .diff-chip.active {
          background-color: var(--bg-elevated);
          color: var(--accent);
          border-color: var(--accent);
          font-weight: 600;
        }

        .diff-chip:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -1px;
        }

        @media (max-width: 640px) {
          .topic-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .interview-actions-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .filter-sort-controls {
            gap: 12px;
            width: 100%;
          }

          .accordion-header {
            padding: 12px;
          }

          .accordion-body {
            padding: 12px;
          }
        }
      `}</style>
    </AppShell>
  );
}
