'use client';
import AppShell from '@/components/layout/AppShell.jsx';
import WorkflowStepTimeline from '@/components/workflow/WorkflowStepTimeline.jsx';
import { useIndexedDBWorkflow } from '@/lib/db/hooks.js';
import { parseAndSanitizeMarkdown } from '@/lib/markdown.js';

export default function WorkflowPageClient({ slug, staticWorkflow, staticAllCategories }) {
  const { workflow, allCategories } = useIndexedDBWorkflow(
    slug,
    staticWorkflow,
    staticAllCategories
  );

  const sidebarItems = (allCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const record = workflow || staticWorkflow || {};
  const frontmatter = record.frontmatter || {};
  const steps = frontmatter.steps || [];

  // HowTo JSON-LD Structured Data
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: frontmatter.title || slug,
    description: frontmatter.description || `Workflow guide for ${slug}`,
    step: steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: `Step ${idx + 1}: ${s.command}`,
      text: s.note || `Run command ${s.command}`,
    })),
  };

  const bodyHtml = record.body ? parseAndSanitizeMarkdown(record.body) : '';

  return (
    <AppShell sidebarItems={sidebarItems}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

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
            Workflow Guide • {frontmatter.category}
          </span>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: '4px',
              marginBottom: '12px',
            }}
          >
            {frontmatter.title || slug}
          </h1>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            {frontmatter.difficulty && (
              <span>
                Difficulty:{' '}
                <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {frontmatter.difficulty}
                </strong>
              </span>
            )}
            {frontmatter.estimatedTime && <span>Est. Time: {frontmatter.estimatedTime}</span>}
          </div>
        </div>

        <WorkflowStepTimeline steps={steps} />

        {bodyHtml && (
          <div
            className="markdown-body"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '24px',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
    </AppShell>
  );
}
