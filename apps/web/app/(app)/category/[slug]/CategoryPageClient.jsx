'use client';
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
    </AppShell>
  );
}
