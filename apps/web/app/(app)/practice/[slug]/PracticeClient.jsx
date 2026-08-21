'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { triggerSync } from '@/lib/db/sync.js';
import { parseBodySections, parseAndSanitizeMarkdown } from '@/lib/markdown.js';

export default function PracticeClient({ currentSlug, staticAllCommands, staticAllCategories }) {
  const [allCommands, setAllCommands] = useState(staticAllCommands);
  const [allCategories, setAllCategories] = useState(staticAllCategories);
  const [solvedProblems, setSolvedProblems] = useState(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

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
    return () => {
      active = false;
    };
  }, []);

  const sidebarItems = allCategories.map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const filteredCommands =
    currentSlug === 'all'
      ? allCommands
      : allCommands.filter(
          (c) => (c.frontmatter?.category || c.category || '').split('/')[0] === currentSlug
        );

  const practiceItems = [];
  for (const cmd of filteredCommands) {
    const sections = parseBodySections(cmd.body || '');
    const pp = sections['Practice Problems'];
    if (pp && pp.trim() && !pp.includes('Not applicable')) {
      const topic = (cmd.frontmatter?.category || cmd.category || 'other').split('/')[0];

      // Separate scenario, hint, and solution from practice problems section if marked
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

      practiceItems.push({
        cmd,
        topic,
        scenarioHtml: parseAndSanitizeMarkdown(scenario),
        hintHtml: hint ? parseAndSanitizeMarkdown(hint) : '',
        solutionHtml: solution ? parseAndSanitizeMarkdown(solution) : '',
      });
    }
  }

  // Reset selected problem index when currentSlug changes
  useEffect(() => {
    setSelectedIndex(0);
    setShowHint(false);
    setShowSolution(false);
  }, [currentSlug]);

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

  const categorySlugs = ['all', ...allCategories.map((c) => c.slug)];
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

        {/* Topic Bar */}
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

        {practiceItems.length === 0 ? (
          <div className="empty-state">No practice problems found for this topic filter.</div>
        ) : (
          <div className="practice-workspace">
            {/* Left Rail: Problem List Selector */}
            <div className="problem-rail">
              <div className="rail-title">Problem Set ({practiceItems.length})</div>
              <div className="rail-list">
                {practiceItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isDone = solvedProblems.has(item.cmd.slug);
                  return (
                    <button
                      key={item.cmd.slug}
                      type="button"
                      className={`rail-item-btn ${isSelected ? 'selected' : ''} ${isDone ? 'done' : ''}`}
                      onClick={() => {
                        setSelectedIndex(idx);
                        setShowHint(false);
                        setShowSolution(false);
                      }}
                    >
                      <span className="rail-item-status">{isDone ? '✓' : idx + 1}</span>
                      <span className="rail-item-name">
                        {item.cmd.frontmatter?.name || item.cmd.slug}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Focused Problem Area */}
            {activeItem && (
              <div className="problem-main-card">
                <div className="card-top-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="topic-tag">{activeItem.topic}</span>
                    <h2 className="problem-cmd-title">
                      {activeItem.cmd.frontmatter?.name || activeItem.cmd.slug}
                    </h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      className={`badge-difficulty difficulty-${activeItem.cmd.frontmatter?.difficulty || 'intermediate'}`}
                    >
                      {activeItem.cmd.frontmatter?.difficulty || 'intermediate'}
                    </span>
                    <button
                      type="button"
                      className={`solved-toggle-btn ${solvedProblems.has(activeItem.cmd.slug) ? 'is-solved' : ''}`}
                      onClick={() => toggleSolved(activeItem.cmd.slug)}
                    >
                      {solvedProblems.has(activeItem.cmd.slug) ? '✓ Solved' : 'Mark Solved'}
                    </button>
                  </div>
                </div>

                {/* Scenario Task */}
                <div className="scenario-section">
                  <h3 className="section-label">Challenge Scenario</h3>
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: activeItem.scenarioHtml }}
                  />
                </div>

                {/* Progressive Disclosure: Hint & Solution */}
                <div className="disclosure-actions">
                  {activeItem.hintHtml && (
                    <button
                      type="button"
                      className="disclosure-btn"
                      onClick={() => setShowHint((prev) => !prev)}
                    >
                      {showHint ? 'Hide Hint 💡' : 'Reveal Hint 💡'}
                    </button>
                  )}
                  {activeItem.solutionHtml && (
                    <button
                      type="button"
                      className="disclosure-btn solution"
                      onClick={() => setShowSolution((prev) => !prev)}
                    >
                      {showSolution ? 'Hide Solution 🔑' : 'Reveal Solution 🔑'}
                    </button>
                  )}
                </div>

                {showHint && activeItem.hintHtml && (
                  <div className="disclosure-box hint-box">
                    <h4 className="box-title">Hint</h4>
                    <div
                      className="markdown-body"
                      dangerouslySetInnerHTML={{ __html: activeItem.hintHtml }}
                    />
                  </div>
                )}

                {showSolution && activeItem.solutionHtml && (
                  <div className="disclosure-box solution-box">
                    <h4 className="box-title">Solution Reference</h4>
                    <div
                      className="markdown-body"
                      dangerouslySetInnerHTML={{ __html: activeItem.solutionHtml }}
                    />
                  </div>
                )}

                {/* Footer Navigation */}
                <div className="card-footer-nav">
                  <button
                    type="button"
                    className="nav-btn"
                    disabled={selectedIndex === 0}
                    onClick={() => {
                      setSelectedIndex((prev) => Math.max(0, prev - 1));
                      setShowHint(false);
                      setShowSolution(false);
                    }}
                  >
                    &larr; Previous Problem
                  </button>
                  <span className="nav-counter">
                    Problem {selectedIndex + 1} of {practiceItems.length}
                  </span>
                  <button
                    type="button"
                    className="nav-btn"
                    disabled={selectedIndex === practiceItems.length - 1}
                    onClick={() => {
                      setSelectedIndex((prev) => Math.min(practiceItems.length - 1, prev + 1));
                      setShowHint(false);
                      setShowSolution(false);
                    }}
                  >
                    Next Problem &rarr;
                  </button>
                </div>
              </div>
            )}
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

        .empty-state {
          padding: 32px;
          text-align: center;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 14px;
        }

        .practice-workspace {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .problem-rail {
          width: 240px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 12px;
          flex-shrink: 0;
          max-height: calc(100vh - 200px);
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
          padding: 8px 10px;
          border-radius: 4px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-muted);
          font-size: 13px;
          text-align: left;
          cursor: pointer;
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
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: var(--bg-base);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .rail-item-btn.done .rail-item-status {
          background-color: var(--accent);
          color: var(--bg-base);
          border-color: var(--accent);
        }

        .rail-item-name {
          font-family: var(--font-mono, monospace);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .problem-main-card {
          flex: 1;
          min-width: 0;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 24px;
        }

        .card-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
          gap: 12px;
          flex-wrap: wrap;
        }

        .topic-tag {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--accent);
          background-color: var(--bg-elevated);
          padding: 2px 8px;
          border-radius: 3px;
        }

        .problem-cmd-title {
          font-size: 20px;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
          color: var(--text-primary);
          margin: 0;
        }

        .badge-difficulty {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
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

        .solved-toggle-btn {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 4px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .solved-toggle-btn:hover {
          background-color: var(--border-subtle);
        }

        .solved-toggle-btn.is-solved {
          background-color: var(--accent);
          color: #000;
          border-color: var(--accent);
        }

        .scenario-section {
          margin-bottom: 24px;
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .disclosure-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .disclosure-btn {
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 4px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .disclosure-btn:hover {
          border-color: var(--accent);
        }

        .disclosure-btn.solution {
          border-color: rgba(96, 165, 250, 0.4);
        }

        .disclosure-box {
          background-color: var(--bg-base);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .disclosure-box.hint-box {
          border-left: 3px solid #facc15;
        }

        .disclosure-box.solution-box {
          border-left: 3px solid var(--accent);
        }

        .box-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-top: 0;
          margin-bottom: 8px;
        }

        .card-footer-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
        }

        .nav-btn {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 4px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          cursor: pointer;
        }

        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .nav-counter {
          font-size: 12px;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .practice-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .practice-workspace {
            flex-direction: column;
          }

          .problem-rail {
            width: 100%;
            max-height: 200px;
          }

          .problem-main-card {
            padding: 16px;
          }
        }
      `}</style>
    </AppShell>
  );
}
