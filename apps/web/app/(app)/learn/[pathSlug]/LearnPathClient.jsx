'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import PathProgressBar from '@/components/learning/PathProgressBar.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { triggerSync } from '@/lib/db/sync.js';

export default function LearnPathClient({ pathSlug, pathData, staticAllCategories }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadProgress() {
      try {
        const records = await db.progressLocal.where('pathSlug').equals(pathSlug).toArray();
        if (active) {
          const completed = new Set(records.map((r) => r.stepIndex));
          setCompletedSteps(completed);
        }
      } catch {
        // Default empty state
      }
    }
    loadProgress();
    return () => {
      active = false;
    };
  }, [pathSlug]);

  async function toggleStep(stepIndex) {
    const next = new Set(completedSteps);
    const key = `${pathSlug}:${stepIndex}`;

    if (next.has(stepIndex)) {
      next.delete(stepIndex);
      try {
        await db.progressLocal.delete(key);
      } catch {
        /* fallback */
      }
    } else {
      next.add(stepIndex);
      try {
        await db.progressLocal.put({
          key,
          pathSlug,
          stepIndex,
          completedAt: new Date().toISOString(),
          pendingSync: true,
        });
      } catch {
        /* fallback */
      }
    }

    setCompletedSteps(next);
    triggerSync();
  }

  const sidebarItems = (staticAllCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const steps = pathData?.steps || [];
  const activeStep = steps[activeStepIndex] || null;
  const isCurrentDone = completedSteps.has(activeStepIndex);
  const difficulty = pathData?.difficulty || 'beginner';

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header Section */}
        <div className="path-detail-header">
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}
            >
              <Link href="/learning" className="back-link">
                &larr; All Curriculums
              </Link>
              <span style={{ color: 'var(--border-subtle)' }}>|</span>
              <span className="path-cat-label">{pathData?.category || 'Curriculum'}</span>
              <span className={`badge-difficulty difficulty-${difficulty}`}>{difficulty}</span>
            </div>
            <h1 className="path-main-title">{pathData?.title || pathSlug}</h1>
            <p className="path-main-desc">{pathData?.description}</p>
          </div>

          <div className="header-progress-wrap">
            <PathProgressBar completedCount={completedSteps.size} totalCount={steps.length} />
          </div>
        </div>

        {/* Step Navigation & Content Workspace */}
        <div className="path-workspace">
          {/* Left Step Rail */}
          <div className="step-rail">
            <div className="rail-header">Curriculum Steps ({steps.length})</div>
            <div className="rail-steps-list">
              {steps.map((step, idx) => {
                const isDone = completedSteps.has(idx);
                const isActive = idx === activeStepIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`step-rail-btn ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    onClick={() => setActiveStepIndex(idx)}
                  >
                    <span className="step-badge">{isDone ? '✓' : idx + 1}</span>
                    <span className="step-title-text">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Active Step Content */}
          {activeStep && (
            <div className="step-main-card">
              <div className="step-card-header">
                <div>
                  <span className="step-number-tag">
                    Step {activeStepIndex + 1} of {steps.length}
                  </span>
                  <h2 className="active-step-title">{activeStep.title}</h2>
                </div>

                <button
                  type="button"
                  className={`toggle-complete-btn ${isCurrentDone ? 'completed' : ''}`}
                  onClick={() => toggleStep(activeStepIndex)}
                >
                  {isCurrentDone ? '✓ Completed' : 'Mark Step Complete'}
                </button>
              </div>

              <div className="step-card-body">
                <p className="step-description">{activeStep.description}</p>

                {activeStep.commandSlug && (
                  <div className="command-ref-box">
                    <span className="box-label">Associated Command Reference</span>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <code className="cmd-code-name">{activeStep.commandSlug}</code>
                      <Link href={`/command/${activeStep.commandSlug}`} className="open-cmd-btn">
                        Open Command Documentation &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Step Prev/Next Controls */}
              <div className="step-card-footer">
                <button
                  type="button"
                  className="step-nav-btn"
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                >
                  &larr; Previous Step
                </button>

                <span className="step-counter-text">
                  {completedSteps.size} of {steps.length} Steps Completed
                </span>

                <button
                  type="button"
                  className="step-nav-btn"
                  disabled={activeStepIndex === steps.length - 1}
                  onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                >
                  Next Step &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .path-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        :global(.back-link) {
          font-size: 12px;
          color: var(--accent) !important;
          text-decoration: none !important;
          font-weight: 500;
        }

        :global(.back-link:hover) {
          text-decoration: underline !important;
        }

        .path-cat-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .path-main-title {
          font-size: 26px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 4px;
          margin-bottom: 6px;
        }

        .path-main-desc {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
        }

        .header-progress-wrap {
          min-width: 240px;
          flex-shrink: 0;
        }

        .path-workspace {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .step-rail {
          width: 260px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 12px;
          flex-shrink: 0;
        }

        .rail-header {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .rail-steps-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .step-rail-btn {
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

        .step-rail-btn:hover {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
        }

        .step-rail-btn.active {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
          border-color: var(--border-subtle);
          font-weight: 600;
        }

        .step-badge {
          width: 20px;
          height: 20px;
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

        .step-rail-btn.done .step-badge {
          background-color: #4ade80;
          color: #000;
          border-color: #4ade80;
        }

        .step-title-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .step-main-card {
          flex: 1;
          min-width: 0;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 24px;
        }

        .step-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding-bottom: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .step-number-tag {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent);
        }

        .active-step-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 4px;
          margin-bottom: 0;
        }

        .toggle-complete-btn {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 4px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .toggle-complete-btn:hover {
          background-color: var(--border-subtle);
        }

        .toggle-complete-btn.completed {
          background-color: #4ade80;
          color: #000;
          border-color: #4ade80;
        }

        .step-card-body {
          margin-bottom: 24px;
        }

        .step-description {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-primary);
          margin: 0 0 20px 0;
        }

        .command-ref-box {
          background-color: var(--bg-base);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 16px;
        }

        .box-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          display: block;
          margin-bottom: 8px;
        }

        .cmd-code-name {
          font-size: 14px;
          font-family: var(--font-mono, monospace);
          font-weight: 600;
          color: var(--accent);
        }

        :global(.open-cmd-btn) {
          font-size: 13px;
          font-weight: 500;
          color: var(--accent) !important;
          text-decoration: none !important;
        }

        :global(.open-cmd-btn:hover) {
          text-decoration: underline !important;
        }

        .step-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .step-nav-btn {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 4px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          cursor: pointer;
        }

        .step-nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .step-counter-text {
          font-size: 12px;
          color: var(--text-muted);
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

        @media (max-width: 768px) {
          .path-detail-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .path-workspace {
            flex-direction: column;
          }

          .step-rail {
            width: 100%;
          }

          .step-main-card {
            padding: 16px;
          }
        }
      `}</style>
    </AppShell>
  );
}
