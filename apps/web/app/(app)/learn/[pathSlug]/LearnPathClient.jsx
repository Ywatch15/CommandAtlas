'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import PathProgressBar from '@/components/learning/PathProgressBar.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { triggerSync } from '@/lib/db/sync.js';

export default function LearnPathClient({ pathSlug, pathData, staticAllCategories }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());

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
      await db.progressLocal.delete(key);
    } else {
      next.add(stepIndex);
      await db.progressLocal.put({
        key,
        pathSlug,
        stepIndex,
        completedAt: new Date().toISOString(),
        pendingSync: true,
      });
    }

    setCompletedSteps(next);
    triggerSync();
  }

  const sidebarItems = (staticAllCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const steps = pathData?.steps || [];

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--accent)',
            }}
          >
            Learning Path
          </span>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: '4px',
              marginBottom: '8px',
            }}
          >
            {pathData?.title || pathSlug}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{pathData?.description}</p>
        </div>

        <PathProgressBar completedCount={completedSteps.size} totalCount={steps.length} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {steps.map((step, idx) => {
            const isDone = completedSteps.has(idx);
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: isDone ? '1px solid var(--success)' : '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleStep(idx)}
                  style={{
                    marginTop: '4px',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: 'var(--success)',
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      Step {idx + 1}: {step.title}
                    </span>
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                    {step.description}
                  </p>

                  {step.commandSlug && (
                    <Link
                      href={`/command/${step.commandSlug}`}
                      style={{
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--accent)',
                        textDecoration: 'none',
                      }}
                    >
                      View Command Reference ({step.commandSlug}) &rarr;
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
