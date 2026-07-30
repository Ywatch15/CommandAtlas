'use client';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';

export default function WorkflowsIndexClient({ staticWorkflows, staticAllCategories }) {
  const sidebarItems = (staticAllCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const workflows = staticWorkflows || [];

  // Group by category
  const grouped = {};
  for (const wf of workflows) {
    const cat = wf.frontmatter?.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(wf);
  }

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Command Workflows
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          Step-by-step guides combining terminal tools into real-world DevOps and system workflows.
        </p>

        {Object.keys(grouped).length === 0 ? (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            No workflows available yet.
          </div>
        ) : (
          Object.entries(grouped).map(([category, list]) => (
            <div key={category} style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textTransform: 'capitalize',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '8px',
                }}
              >
                {category}
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {list.map((wf) => (
                  <Link
                    key={wf.slug}
                    href={`/workflow/${wf.slug}`}
                    style={{
                      textDecoration: 'none',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: '8px',
                        }}
                      >
                        {wf.frontmatter?.title || wf.slug}
                      </h3>
                      {wf.frontmatter?.estimatedTime && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                          Est. Time: {wf.frontmatter.estimatedTime}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: 'var(--accent)',
                        fontWeight: 500,
                      }}
                    >
                      {wf.frontmatter?.steps?.length || 0} steps &rarr;
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
