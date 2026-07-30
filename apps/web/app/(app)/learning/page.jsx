import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { getAllCategories } from '@/lib/content.js';

export const metadata = {
  title: 'Learning Paths — CommandAtlas',
  description: 'Structured, step-by-step terminal learning paths.',
};

export default async function LearningPage() {
  const staticAllCategories = await getAllCategories();
  const sidebarItems = (staticAllCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const paths = [
    {
      slug: 'linux-fundamentals',
      title: 'Linux Fundamentals for DevOps',
      description:
        'Master essential Linux terminal navigation, file permissions, and process management.',
      stepCount: 3,
    },
  ];

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
          Learning Paths
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          Structured step-by-step curriculums designed for hands-on terminal mastery.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {paths.map((p) => (
            <Link
              key={p.slug}
              href={`/learn/${p.slug}`}
              style={{
                textDecoration: 'none',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent)',
                  }}
                >
                  Curriculum
                </span>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    marginBottom: '8px',
                  }}
                >
                  {p.title}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                  {p.description}
                </p>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  fontSize: '13px',
                  color: 'var(--accent)',
                  fontWeight: 500,
                }}
              >
                {p.stepCount} Steps &rarr;
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
