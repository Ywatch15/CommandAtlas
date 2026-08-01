'use client';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import CommandHeader from '@/components/command/CommandHeader.jsx';
import SyntaxBlock from '@/components/command/SyntaxBlock.jsx';
import { useIndexedDBCommand } from '@/lib/db/hooks.js';
import { parseBodySections, extractCodeBlock, parseAndSanitizeMarkdown } from '@/lib/markdown.js';
import BookmarkButton from '@/components/command/BookmarkButton.jsx';
import NoteEditor from '@/components/command/NoteEditor.jsx';
import RelatedCommandsRail from '@/components/command/RelatedCommandsRail.jsx';

export default function CommandPageClient({ slug, staticCommand, staticAllCategories }) {
  const { command, allCategories } = useIndexedDBCommand(slug, staticCommand, staticAllCategories);

  const sidebarItems = (allCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
    active: cat.slug === command?.frontmatter?.category,
  }));

  if (!command) {
    return (
      <AppShell sidebarItems={sidebarItems}>
        <div style={{ color: 'var(--text-muted)' }}>Command not found</div>
      </AppShell>
    );
  }

  const { frontmatter = {}, body = '' } = command;
  const sections = parseBodySections(body);

  const syntaxCode = extractCodeBlock(sections['Syntax'] || '');

  const sectionsToRender = [
    'What is it?',
    'Why does it exist?',
    'Examples',
    'Real-World Scenarios',
    'When should it NOT be used?',
    'How it works internally',
    'Performance Notes',
    'Security Notes',
    'Common Mistakes',
    'Best Practices',
    'Interview Questions',
    'Practice Problems',
    'References',
  ];

  const techArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: frontmatter.name || slug,
    description: frontmatter.summary || `Developer reference for ${frontmatter.name || slug}`,
    articleSection: frontmatter.category,
    dependencies: frontmatter.supportedOS ? frontmatter.supportedOS.join(', ') : 'Linux',
  };

  return (
    <AppShell sidebarItems={sidebarItems}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleSchema) }}
      />
      <div className="command-detail-layout">
        {/* Left Column: Main content */}
        <div className="main-content-column">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
            }}
          >
            <CommandHeader
              name={frontmatter.name || command.name || slug}
              aliases={frontmatter.aliases || frontmatter.alias}
              difficulty={frontmatter.difficulty}
              supportedOS={frontmatter.supportedOS}
              shell={frontmatter.shell}
            />
            <BookmarkButton commandSlug={slug} />
          </div>

          {/* Syntax Section */}
          {syntaxCode && (
            <div style={{ marginBottom: 'var(--space-section)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Syntax
              </h2>
              <SyntaxBlock code={syntaxCode} />
            </div>
          )}

          {/* Flags Section */}
          {sections['Flags'] && (
            <div style={{ marginBottom: 'var(--space-section)' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                }}
              >
                Flags
              </h2>
              <div
                dangerouslySetInnerHTML={{ __html: parseAndSanitizeMarkdown(sections['Flags']) }}
              />
            </div>
          )}

          {/* Render remaining sections */}
          {sectionsToRender.map((secName) => {
            const secContent = sections[secName];
            if (!secContent) return null;
            return (
              <div key={secName} style={{ marginBottom: 'var(--space-section)' }}>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                  }}
                >
                  {secName}
                </h2>
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: parseAndSanitizeMarkdown(secContent) }}
                  style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}
                />
              </div>
            );
          })}

          <NoteEditor commandSlug={slug} />
        </div>

        {/* Right Column: Sidebar Rail */}
        <div className="right-rail-column">
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: 'var(--space-component)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <RelatedCommandsRail
              relatedCommands={frontmatter.relatedCommands}
              alternatives={frontmatter.alternatives}
            />

            {/* Metadata info */}
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <div>
                Category:{' '}
                <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {frontmatter.category}
                </span>
              </div>
              {frontmatter.usedInWorkflows && frontmatter.usedInWorkflows.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h3
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                      marginBottom: '12px',
                    }}
                  >
                    Used in Workflows
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {frontmatter.usedInWorkflows.map((wf) => (
                      <Link
                        key={wf.slug}
                        href={`/workflow/${wf.slug}`}
                        style={{
                          fontSize: '13px',
                          color: 'var(--accent)',
                          textDecoration: 'none',
                        }}
                      >
                        {wf.title || wf.slug}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .command-detail-layout {
          display: flex;
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .main-content-column {
          flex: 1;
          min-width: 0;
        }
        .right-rail-column {
          width: 280px;
          flex-shrink: 0;
        }
        @media (max-width: 1024px) {
          .command-detail-layout {
            flex-direction: column;
          }
          .right-rail-column {
            width: 100%;
          }
        }
      `}</style>
    </AppShell>
  );
}
