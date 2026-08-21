'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { parseBodySections, parseAndSanitizeMarkdown } from '@/lib/markdown.js';

function formatInterviewQA(html) {
  if (!html) return '';
  let formatted = html
    .replace(
      /<p>\s*<strong>Q:?<\/strong>\s*/gi,
      '<div class="iq-q-row"><span class="iq-q-badge">Q</span><div class="iq-q-content">'
    )
    .replace(
      /<\/p>\s*<p>\s*<strong>A:?<\/strong>\s*/gi,
      '</div></div><div class="iq-a-row"><span class="iq-a-badge">A</span><div class="iq-a-content">'
    );

  if (formatted.includes('class="iq-q-row"') && !formatted.includes('class="iq-a-row"')) {
    formatted += '</div></div>';
  } else if (formatted.includes('class="iq-a-row"')) {
    formatted += '</div></div>';
  }
  return formatted;
}

export default function InterviewPrepClient({
  currentSlug,
  staticAllCommands,
  staticAllCategories,
}) {
  const [allCommands, setAllCommands] = useState(staticAllCommands);
  const [allCategories, setAllCategories] = useState(staticAllCategories);
  const [openItems, setOpenItems] = useState(new Set());

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
  }, []);

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

  // Group commands with non-empty "Interview Questions" section by category
  const grouped = {};
  for (const cmd of filteredCommands) {
    const sections = parseBodySections(cmd.body || '');
    const iq = sections['Interview Questions'];
    if (iq && iq.trim() && !iq.includes('Not applicable')) {
      const catKey = (cmd.frontmatter?.category || cmd.category || 'other').split('/')[0];
      if (!grouped[catKey]) grouped[catKey] = [];
      grouped[catKey].push({ cmd, questionHtml: parseAndSanitizeMarkdown(iq) });
    }
  }

  // Automatically open first 3 questions in each group on initial render
  useEffect(() => {
    const initialOpen = new Set();
    Object.values(grouped).forEach((items) => {
      items.slice(0, 3).forEach(({ cmd }) => initialOpen.add(cmd.slug));
    });
    setOpenItems(initialOpen);
  }, [currentSlug, allCommands.length]);

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

  const expandAllInTopic = (items) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      items.forEach(({ cmd }) => next.add(cmd.slug));
      return next;
    });
  };

  const collapseAllInTopic = (items) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      items.forEach(({ cmd }) => next.delete(cmd.slug));
      return next;
    });
  };

  const categorySlugs = ['all', ...allCategories.map((c) => c.slug)];

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

        {/* Content Grouped by Topic */}
        {Object.keys(grouped).length === 0 ? (
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
            No interview questions found for this topic filter.
          </div>
        ) : (
          Object.entries(grouped).map(([topic, items]) => (
            <div key={topic} style={{ marginBottom: '40px' }}>
              <div className="topic-section-header">
                <h2 className="topic-title">{topic}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="action-link-btn"
                    onClick={() => expandAllInTopic(items)}
                  >
                    Expand All
                  </button>
                  <span style={{ color: 'var(--border-subtle)' }}>|</span>
                  <button
                    type="button"
                    className="action-link-btn"
                    onClick={() => collapseAllInTopic(items)}
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map(({ cmd, questionHtml }) => {
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
                            }}
                          >
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                          <span className="cmd-title-name">
                            {cmd.frontmatter?.name || cmd.slug}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexShrink: 0,
                          }}
                        >
                          <span className={`badge-difficulty difficulty-${difficulty}`}>
                            {difficulty}
                          </span>
                          <Link
                            href={`/command/${cmd.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="cmd-ref-link"
                          >
                            Ref &rarr;
                          </Link>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="accordion-body">
                          <div
                            className="markdown-body"
                            dangerouslySetInnerHTML={{ __html: formatInterviewQA(questionHtml) }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
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

        :global(.iq-q-row) {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
        }

        :global(.iq-q-badge) {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 2px 6px;
          line-height: 1.2;
          flex-shrink: 0;
          margin-top: 2px;
        }

        :global(.iq-q-content) {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.5;
          flex: 1;
        }

        :global(.iq-a-row) {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border-left: 2px solid var(--border-subtle);
          padding-left: 12px;
          margin-left: 4px;
          margin-top: 8px;
        }

        :global(.iq-a-badge) {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 2px 6px;
          line-height: 1.2;
          flex-shrink: 0;
          margin-top: 2px;
        }

        :global(.iq-a-content) {
          font-size: 14px;
          font-weight: 400;
          color: var(--text-primary);
          line-height: 1.6;
          flex: 1;
        }

        :global(.iq-a-content p) {
          margin: 0 0 8px 0;
        }
        :global(.iq-a-content p:last-child) {
          margin: 0;
        }

        @media (max-width: 640px) {
          .topic-bar {
            flex-direction: column;
            align-items: flex-start;
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
