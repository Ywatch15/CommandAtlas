'use client';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell.jsx';
import CommandCard from '@/components/command/CommandCard.jsx';
import { useIndexedDBCategory } from '@/lib/db/hooks.js';
import { extractCommandSummary } from '@/lib/markdown.js';

const CLOUD_PROVIDERS = [
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'gcp', label: 'GCP' },
];

export default function CategoryPageClient({
  slug,
  staticCategory,
  staticCommands,
  staticAllCategories,
}) {
  const { category, commands, allCategories } = useIndexedDBCategory(
    slug,
    staticCategory,
    staticCommands,
    staticAllCategories
  );

  const sidebarItems = (allCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
    active: cat.slug === slug,
  }));

  if (!category) {
    return (
      <AppShell sidebarItems={sidebarItems}>
        <div style={{ color: 'var(--text-muted)' }}>Category not found</div>
      </AppShell>
    );
  }

  const categoryName = category.frontmatter?.name || category.name || slug;
  const categoryDesc = category.frontmatter?.description || category.description || '';
  const cmdList = commands || [];

  const renderCommandCard = (cmd) => (
    <CommandCard
      key={cmd.slug}
      slug={cmd.slug}
      name={cmd.frontmatter?.name || cmd.name || cmd.slug}
      summary={extractCommandSummary(cmd)}
      difficulty={cmd.frontmatter?.difficulty}
      supportedOS={cmd.frontmatter?.supportedOS}
      category={categoryName}
    />
  );

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div
        style={{
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-section)',
        }}
      >
        {/* Category Filter Pills: single horizontally scrollable row below 768px, no wrapping */}
        <div className="category-pill-bar">
          <div className="category-pills">
            {(allCategories || []).map((cat) => {
              const isActive = cat.slug === slug;
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`category-pill ${isActive ? 'active' : ''}`}
                >
                  {cat.frontmatter?.name || cat.name || cat.slug}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '8px' }}>{categoryName}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {categoryDesc}
          </p>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 'var(--space-section)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '16px' }}>Commands</h2>
          {cmdList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No commands in this category yet.</p>
          ) : slug === 'cloud-cli' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {CLOUD_PROVIDERS.map((provider) => {
                const providerCmds = cmdList.filter((cmd) => {
                  const tags = (cmd.frontmatter?.tags || cmd.tags || []).map((t) =>
                    String(t).toLowerCase()
                  );
                  return tags.includes(provider.id);
                });
                return (
                  <section key={provider.id} aria-labelledby={`heading-${provider.id}`}>
                    <h3
                      id={`heading-${provider.id}`}
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        marginBottom: '12px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {provider.label}
                    </h3>
                    {providerCmds.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        No commands in this section yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {providerCmds.map(renderCommandCard)}
                      </div>
                    )}
                  </section>
                );
              })}
              {(() => {
                const generalCmds = cmdList.filter((cmd) => {
                  const tags = (cmd.frontmatter?.tags || cmd.tags || []).map((t) =>
                    String(t).toLowerCase()
                  );
                  return !tags.includes('aws') && !tags.includes('azure') && !tags.includes('gcp');
                });
                if (generalCmds.length === 0) return null;
                return (
                  <section key="general" aria-labelledby="heading-general">
                    <h3
                      id="heading-general"
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        marginBottom: '12px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      General
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {generalCmds.map(renderCommandCard)}
                    </div>
                  </section>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cmdList.map(renderCommandCard)}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .category-pill-bar {
          display: flex;
          align-items: center;
          background-color: var(--bg-recessed);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 12px 16px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .category-pill-bar::-webkit-scrollbar {
          display: none;
        }

        .category-pills {
          display: flex;
          gap: var(--space-tag-gap, 0.5rem);
          flex-wrap: wrap;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .category-pills::-webkit-scrollbar {
          display: none;
        }

        :global(.category-pill) {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 4px;
          text-decoration: none !important;
          text-transform: capitalize;
          background-color: var(--bg-elevated);
          color: var(--text-secondary) !important;
          border: 1px solid var(--border-subtle);
          white-space: nowrap;
          flex-shrink: 0;
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s ease;
        }

        :global(.category-pill:hover) {
          color: var(--text-primary) !important;
          background-color: var(--bg-hover) !important;
          border-color: var(--border-section) !important;
        }

        :global(.category-pill.active) {
          background-color: var(--accent-bg) !important;
          color: var(--accent-primary) !important;
          border: 1px solid var(--accent-primary) !important;
        }

        @media (max-width: 768px) {
          .category-pills {
            flex-wrap: nowrap;
          }
        }
      `}</style>
    </AppShell>
  );
}
