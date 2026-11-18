'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { triggerSync } from '@/lib/db/sync.js';
import SortFilterBar from '@/components/common/SortFilterBar.jsx';
import QACard from '@/components/common/QACard.jsx';
import { parseBodySections, parseAndSanitizeMarkdown } from '@/lib/markdown.js';

export default function PracticeClient({ currentSlug, staticAllCommands, staticAllCategories }) {
  const [allCommands, setAllCommands] = useState(staticAllCommands);
  const [allCategories, setAllCategories] = useState(staticAllCategories);
  const [solvedProblems, setSolvedProblems] = useState(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortBy, setSortBy] = useState('topic');
  const [selectedDifficulties, setSelectedDifficulties] = useState(new Set());
  const [mobileTab, setMobileTab] = useState('detail');

  useEffect(() => {
    let active = true;
    async function loadLocalData() {
      try {
        const localCmds = await db.commands.toArray();
        const localCats = await db.categories.toArray();
        const progressRecords = await db.progressLocal
          .filter((r) => typeof r.key === 'string' && r.key.startsWith('practice:'))
          .toArray();

        if (!active) return;
        if (localCmds.length > 0) setAllCommands(localCmds);
        if (localCats.length > 0) setAllCategories(localCats);

        const solved = new Set(progressRecords.map((r) => r.key.replace('practice:', '')));
        setSolvedProblems(solved);
      } catch {
        /* fallback */
      }
    }
    loadLocalData();

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
    return () => {
      active = false;
    };
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

  const filteredCommands =
    currentSlug === 'all'
      ? allCommands
      : allCommands.filter(
          (c) => (c.frontmatter?.category || c.category || '').split('/')[0] === currentSlug
        );

  const DIFFICULTY_RANK = { beginner: 1, intermediate: 2, advanced: 3 };

  const rawPracticeItems = [];
  for (const cmd of filteredCommands) {
    const diff = (cmd.frontmatter?.difficulty || 'intermediate').toLowerCase();
    if (selectedDifficulties.size > 0 && !selectedDifficulties.has(diff)) {
      continue;
    }

    const sections = parseBodySections(cmd.body || '');
    const pp = sections['Practice Problems'];
    if (pp && pp.trim() && !pp.includes('Not applicable')) {
      const topic = (cmd.frontmatter?.category || cmd.category || 'other').split('/')[0];

      let scenario = pp;
      let hint = '';
      let solution = '';

      if (pp.includes('### Solution') || pp.includes('**Solution**')) {
        const parts = pp.split(/### Solution|\*\*Solution\*\*/i);
        scenario = parts[0];
        solution = parts[1] || '';
      }

      if (scenario.includes('### Hint') || scenario.includes('**Hint**')) {
        const hintParts = scenario.split(/### Hint|\*\*Hint\*\*/i);
        scenario = hintParts[0];
        hint = hintParts[1] || '';
      }

      rawPracticeItems.push({
        cmd,
        topic,
        diff,
        scenarioHtml: parseAndSanitizeMarkdown(scenario),
        hintHtml: hint ? parseAndSanitizeMarkdown(hint) : '',
        solutionHtml: solution ? parseAndSanitizeMarkdown(solution) : '',
      });
    }
  }

  // Sort practice items
  const practiceItems = [...rawPracticeItems].sort((a, b) => {
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
    if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
    const nameA = (a.cmd.frontmatter?.name || a.cmd.slug).toLowerCase();
    const nameB = (b.cmd.frontmatter?.name || b.cmd.slug).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [currentSlug, sortBy, selectedDifficulties.size]);

  const activeItem = practiceItems[selectedIndex] || null;

  const toggleSolved = async (cmdSlug) => {
    const next = new Set(solvedProblems);
    const key = `practice:${cmdSlug}`;

    if (next.has(cmdSlug)) {
      next.delete(cmdSlug);
      try {
        await db.progressLocal.delete(key);
      } catch {
        /* fallback */
      }
    } else {
      next.add(cmdSlug);
      try {
        await db.progressLocal.put({
          key,
          pathSlug: 'practice',
          stepIndex: cmdSlug,
          completedAt: new Date().toISOString(),
          pendingSync: true,
        });
      } catch {
        /* fallback */
      }
    }

    setSolvedProblems(next);
    triggerSync();
  };

  const categorySlugs = ['all', ...(allCategories || []).map((c) => c.slug)];
  const totalCount = practiceItems.length;
  const solvedCount = practiceItems.filter((item) => solvedProblems.has(item.cmd.slug)).length;

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="practice-header">
          <div>
            <span className="practice-eyebrow">Interactive Environment</span>
            <h1 className="practice-title">Terminal Practice Lab</h1>
            <p className="practice-desc">
              Hands-on scenario challenges and problem sets designed for terminal command mastery.
            </p>
          </div>
          <div className="progress-card">
            <div className="progress-stat">
              <span className="progress-number">
                {solvedCount} / {totalCount}
              </span>
              <span className="progress-label">Problems Solved</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: totalCount > 0 ? `${Math.round((solvedCount / totalCount) * 100)}%` : '0%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Topic Bar: single horizontally scrollable row below 768px */}
        <div className="topic-bar">
          <span className="topic-label">Category Filter:</span>
          <div className="topic-pills">
            {categorySlugs.map((slug) => {
              const isActive = slug === currentSlug;
              return (
                <Link
                  key={slug}
                  href={`/practice/${slug}`}
                  className={`topic-pill ${isActive ? 'active' : ''}`}
                >
                  {slug}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Shared Global Filter/Sort Bar */}
        <SortFilterBar
          sortBy={sortBy}
          onSortChange={handleSortChange}
          selectedDifficulties={selectedDifficulties}
          onToggleDifficulty={toggleDifficultyFilter}
        />

        {practiceItems.length === 0 ? (
          <div className="empty-state">No practice problems found for this topic filter.</div>
        ) : (
          <div>
            {/* Mobile View Toggle Bar: below 768px only */}
            <div className="mobile-view-tabs">
              <button
                type="button"
                className={`mobile-tab-btn ${mobileTab === 'list' ? 'active' : ''}`}
                onClick={() => setMobileTab('list')}
              >
                Problem List ({practiceItems.length})
              </button>
              <button
                type="button"
                className={`mobile-tab-btn ${mobileTab === 'detail' ? 'active' : ''}`}
                onClick={() => setMobileTab('detail')}
              >
                Problem Details
              </button>
            </div>

            <div className="practice-workspace">
              {/* Left Rail: Proportional 32% width on desktop, full-width on mobile */}
              <div className={`problem-rail ${mobileTab === 'detail' ? 'mobile-hide' : ''}`}>
                <div className="rail-title">Problem Set ({practiceItems.length})</div>
                <div className="rail-list">
                  {practiceItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const isDone = solvedProblems.has(item.cmd.slug);
                    const name = item.cmd.frontmatter?.name || item.cmd.slug;
                    return (
                      <button
                        key={item.cmd.slug}
                        type="button"
                        className={`rail-item-btn ${isSelected ? 'selected' : ''} ${isDone ? 'done' : ''}`}
                        title={name}
                        onClick={() => {
                          setSelectedIndex(idx);
                          setMobileTab('detail');
                        }}
                      >
                        <span className="rail-item-status">{isDone ? '✓' : idx + 1}</span>
                        <span className="rail-item-name" title={name}>
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Focused Problem Area via shared QACard */}
              {activeItem && (
                <div className={`problem-main-view ${mobileTab === 'list' ? 'mobile-hide' : ''}`}>
                  <QACard
                    mode="practice"
                    title={activeItem.cmd.frontmatter?.name || activeItem.cmd.slug}
                    commandSlug={activeItem.cmd.slug}
                    topic={activeItem.topic}
                    difficulty={activeItem.cmd.frontmatter?.difficulty || 'intermediate'}
                    scenarioHtml={activeItem.scenarioHtml}
                    hintHtml={activeItem.hintHtml}
                    solutionHtml={activeItem.solutionHtml}
                    isSolved={solvedProblems.has(activeItem.cmd.slug)}
                    onToggleSolved={() => toggleSolved(activeItem.cmd.slug)}
                    onBackToList={() => setMobileTab('list')}
                    selectedIndex={selectedIndex}
                    totalCount={practiceItems.length}
                    onPrev={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
                    onNext={() =>
                      setSelectedIndex((prev) => Math.min(practiceItems.length - 1, prev + 1))
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .practice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 24px;
        }

        .practice-eyebrow {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent);
        }

        .practice-title {
          font-size: 26px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 4px;
          margin-bottom: 4px;
        }

        .practice-desc {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
        }

        .progress-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 12px 18px;
          min-width: 180px;
          flex-shrink: 0;
        }

        .progress-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .progress-number {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .progress-label {
          font-size: 11px;
          color: var(--text-muted);
        }

        .progress-bar-bg {
          height: 6px;
          background-color: var(--bg-elevated);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background-color: var(--accent);
          transition: width 0.25s ease;
        }

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

        /* Non-wrapping, horizontally scrollable single row */
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

        .empty-state {
          padding: 32px;
          text-align: center;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 14px;
        }

        .mobile-view-tabs {
          display: none;
          gap: 8px;
          margin-bottom: 16px;
        }

        .mobile-tab-btn {
          flex: 1;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
          background-color: var(--bg-surface);
          color: var(--text-muted);
          cursor: pointer;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .mobile-tab-btn.active {
          background-color: var(--bg-elevated);
          color: var(--accent);
          border-color: var(--accent);
          font-weight: 600;
        }

        .practice-workspace {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        /* Proportional 32% width on desktop, min 280px */
        .problem-rail {
          flex: 0 0 32%;
          width: 32%;
          min-width: 280px;
          max-width: 380px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 14px;
          flex-shrink: 0;
          max-height: calc(100vh - 180px);
          overflow-y: auto;
        }

        .rail-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .rail-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .rail-item-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 4px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-muted);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          width: 100%;
          min-height: 44px;
          min-width: 0;
          transition: all 0.15s ease;
        }

        .rail-item-btn:hover {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
        }

        .rail-item-btn.selected {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
          border-color: var(--border-subtle);
          font-weight: 600;
        }

        .rail-item-status {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: var(--bg-base);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .rail-item-btn.done .rail-item-status {
          background-color: var(--accent);
          color: var(--bg-base);
          border-color: var(--accent);
        }

        /* Proportional text display without premature ellipsis */
        .rail-item-name {
          font-family: var(--font-mono, monospace);
          font-size: 13px;
          line-height: 1.4;
          white-space: normal;
          word-break: break-word;
          flex: 1;
          min-width: 0;
        }

        .problem-main-view {
          flex: 1;
          min-width: 0;
          width: 100%;
        }

        /* Responsive Layout: below 768px */
        @media (max-width: 768px) {
          .practice-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .mobile-view-tabs {
            display: flex;
          }

          .practice-workspace {
            flex-direction: column;
            gap: 16px;
          }

          .problem-rail {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            max-height: none; /* Full view on mobile */
          }

          .problem-main-view {
            width: 100% !important;
            min-width: 100% !important;
          }

          /* Ensure list and detail are separate views, never side-by-side */
          .mobile-hide {
            display: none !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
