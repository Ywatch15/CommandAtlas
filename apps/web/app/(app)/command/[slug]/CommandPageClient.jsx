'use client';
import AppShell from '@/components/layout/AppShell.jsx';
import CommandHeader from '@/components/command/CommandHeader.jsx';
import SyntaxBlock from '@/components/command/SyntaxBlock.jsx';
import { useIndexedDBCommand } from '@/lib/db/hooks.js';
import { parseBodySections, extractCodeBlock, parseAndSanitizeMarkdown } from '@/lib/markdown.js';
import Link from 'next/link';

export default function CommandPageClient({ slug, staticCommand, staticAllCategories }) {
  const { command, allCategories } = useIndexedDBCommand(slug, staticCommand, staticAllCategories);

  const sidebarItems = allCategories.map((cat) => ({
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

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div className="command-detail-layout">
        {/* Left Column: Main content */}
        <div className="main-content-column">
          <CommandHeader
            name={frontmatter.name || command.name || slug}
            aliases={frontmatter.aliases || frontmatter.alias}
            difficulty={frontmatter.difficulty}
            supportedOS={frontmatter.supportedOS}
            shell={frontmatter.shell}
          />

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
            {/* Related Commands */}
            {frontmatter.relatedCommands && frontmatter.relatedCommands.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Related Commands
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {frontmatter.relatedCommands.map((rel) => (
                    <Link
                      key={rel}
                      href={`/command/${rel}`}
                      style={{
                        fontSize: '14px',
                        color: 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {rel}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {frontmatter.alternatives && frontmatter.alternatives.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Alternatives
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {frontmatter.alternatives.map((alt) => (
                    <Link
                      key={alt}
                      href={`/command/${alt}`}
                      style={{
                        fontSize: '14px',
                        color: 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {alt}
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
              {command.contentVersion && (
                <div>
                  Version:{' '}
                  <span style={{ color: 'var(--text-primary)' }}>{command.contentVersion}</span>
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
