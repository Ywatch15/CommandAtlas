'use client';
import AppShell from '@/components/layout/AppShell.jsx';
import CommandCard from '@/components/command/CommandCard.jsx';
import { useIndexedDBCategory } from '@/lib/db/hooks.js';

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

  const sidebarItems = allCategories.map((cat) => ({
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
          {commands.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No commands in this category yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {commands.map((cmd) => (
                <CommandCard
                  key={cmd.slug}
                  slug={cmd.slug}
                  name={cmd.frontmatter?.name || cmd.name || cmd.slug}
                  summary={cmd.frontmatter?.summary || cmd.body?.split('\n')[0] || ''}
                  difficulty={cmd.frontmatter?.difficulty}
                  supportedOS={cmd.frontmatter?.supportedOS}
                  category={categoryName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
