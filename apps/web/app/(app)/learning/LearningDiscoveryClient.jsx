'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { STATIC_PATHS } from '@/lib/learningPathsData.js';
import EmptyState from '@/components/common/EmptyState.jsx';

export default function LearningDiscoveryClient({ staticAllCategories = [] }) {
  const [pathProgressMap, setPathProgressMap] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let active = true;
    async function loadAllProgress() {
      try {
        const records = await db.progressLocal.toArray();
        if (!active) return;

        const map = {};
        for (const r of records) {
          if (r.pathSlug) {
            if (!map[r.pathSlug]) map[r.pathSlug] = new Set();
            map[r.pathSlug].add(r.stepIndex);
          }
        }
        setPathProgressMap(map);
      } catch {
        /* fallback */
      }
    }
    loadAllProgress();
    return () => {
      active = false;
    };
  }, []);

  const sidebarItems = (staticAllCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const allPathsList = Object.values(STATIC_PATHS);

  const filterCategories = ['all', 'linux', 'git', 'docker', 'networking'];

  const filteredPaths =
    selectedCategory === 'all'
      ? allPathsList
      : allPathsList.filter(
          (p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase()
        );

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
            Structured Curriculums
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
            Learning Path Discovery
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Step-by-step terminal mastery programs with progress tracking and interactive hands-on
            references.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <span className="filter-label">Filter Curriculum:</span>
          <div className="filter-pills">
            {filterCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Path Grid */}
        {filteredPaths.length === 0 ? (
          <EmptyState
            title="No Learning Paths Found"
            message={`No learning programs match the "${selectedCategory}" category filter.`}
            actionLabel="Reset Category Filter"
            onAction={() => setSelectedCategory('all')}
          />
        ) : (
          <div className="paths-grid">
            {filteredPaths.map((path) => {
              const completedSet = pathProgressMap[path.slug] || new Set();
              const totalSteps = path.steps?.length || 0;
              const doneSteps = completedSet.size;
              const isCompleted = totalSteps > 0 && doneSteps === totalSteps;
              const isInProgress = doneSteps > 0 && doneSteps < totalSteps;
              const progressPercent =
                totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
              const difficulty = path.difficulty || 'beginner';

              return (
                <Link key={path.slug} href={`/learn/${path.slug}`} className="path-card">
                  <div className="path-card-top">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span className="path-cat-badge">{path.category || 'Curriculum'}</span>
                      <span className={`badge-difficulty difficulty-${difficulty}`}>
                        {difficulty}
                      </span>
                    </div>

                    <h2 className="path-title">{path.title}</h2>
                    <p className="path-desc">{path.description}</p>
                  </div>

                  <div className="path-card-bottom">
                    <div className="path-meta-row">
                      <span className="step-count">{totalSteps} Steps</span>
                      <span
                        className={`status-tag ${isCompleted ? 'completed' : isInProgress ? 'in-progress' : ''}`}
                      >
                        {isCompleted ? '✓ Completed' : isInProgress ? 'In Progress' : 'Not Started'}
                      </span>
                    </div>

                    <div className="progress-bar-bg">
                      <div
                        className={`progress-bar-fill ${isCompleted ? 'completed' : ''}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .filter-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .filter-pill {
          font-size: 13px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 4px;
          text-transform: capitalize;
          background-color: transparent;
          color: var(--text-muted);
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .filter-pill:hover {
          color: var(--text-primary);
          background-color: var(--bg-surface);
        }

        .filter-pill.active {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
          border-color: var(--border-subtle);
        }

        .paths-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        :global(.path-card) {
          text-decoration: none !important;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition:
            border-color 0.15s ease,
            transform 0.15s ease;
        }

        :global(.path-card:hover) {
          border-color: var(--accent) !important;
        }

        .path-cat-badge {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent);
        }

        .path-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 10px;
          margin-bottom: 8px;
        }

        .path-desc {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.5;
        }

        .path-card-bottom {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .path-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .step-count {
          color: var(--text-muted);
          font-weight: 500;
        }

        .status-tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .status-tag.in-progress {
          color: #facc15;
        }

        .status-tag.completed {
          color: #4ade80;
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

        .progress-bar-fill.completed {
          background-color: #4ade80;
        }

        .badge-difficulty {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 2px 6px;
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
      `}</style>
    </AppShell>
  );
}
