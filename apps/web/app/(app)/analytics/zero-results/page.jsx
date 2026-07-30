import AppShell from '@/components/layout/AppShell.jsx';
import { getAllCategories } from '@/lib/content.js';

export const metadata = {
  title: 'Zero-Result Query Insights — CommandAtlas Maintainers',
  robots: { index: false, follow: false },
};

export default async function ZeroResultsAnalyticsPage() {
  const staticAllCategories = await getAllCategories();
  const sidebarItems = (staticAllCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Zero-Result Search Insights
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Privacy-preserving log of terms users searched for that produced 0 command hits. Used by
          maintainers to prioritize new content additions.
        </p>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 180px',
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px',
              marginBottom: '12px',
            }}
          >
            <span>Query Term</span>
            <span>Frequency</span>
            <span>Last Searched</span>
          </div>

          <div
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            No zero-result search queries recorded in current release window.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
