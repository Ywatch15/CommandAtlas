'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { parseBodySections, extractCodeBlock, parseAndSanitizeMarkdown } from '@/lib/markdown.js';

export default function ComparePageClient({ staticAllCommands, staticAllCategories }) {
  const [allCommands, setAllCommands] = useState(staticAllCommands);
  const [allCategories, setAllCategories] = useState(staticAllCategories);
  const [slugA, setSlugA] = useState('');
  const [slugB, setSlugB] = useState('');

  useEffect(() => {
    async function loadLocal() {
      try {
        const localCmds = await db.commands.toArray();
        const localCats = await db.categories.toArray();
        if (localCmds.length > 0) setAllCommands(localCmds);
        if (localCats.length > 0) setAllCategories(localCats);
      } catch {
        /* fallback to static */
      }
    }
    loadLocal();
  }, []);

  const cmdA = slugA ? allCommands.find((c) => c.slug === slugA) : null;
  const cmdB = slugB ? allCommands.find((c) => c.slug === slugB) : null;

  const sidebarItems = allCategories.map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  const selectStyle = {
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    flex: 1,
    minWidth: 0,
  };

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '16px',
          }}
        >
          Compare Commands
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Select two commands to compare side by side.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          <select
            id="compare-select-a"
            value={slugA}
            onChange={(e) => setSlugA(e.target.value)}
            style={selectStyle}
            aria-label="First command"
          >
            <option value="">Select command...</option>
            {allCommands.map((cmd) => (
              <option key={cmd.slug} value={cmd.slug}>
                {cmd.frontmatter?.name || cmd.slug}
              </option>
            ))}
          </select>

          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            vs
          </span>

          <select
            id="compare-select-b"
            value={slugB}
            onChange={(e) => setSlugB(e.target.value)}
            style={selectStyle}
            aria-label="Second command"
          >
            <option value="">Select command...</option>
            {allCommands.map((cmd) => (
              <option key={cmd.slug} value={cmd.slug}>
                {cmd.frontmatter?.name || cmd.slug}
              </option>
            ))}
          </select>
        </div>

        {cmdA && cmdB && <CompareTable cmdA={cmdA} cmdB={cmdB} />}

        {(slugA && !cmdA) || (slugB && !cmdB) ? (
          <p style={{ color: 'var(--danger)', fontSize: '14px' }}>
            One or both selected commands could not be found.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function field(cmd, key) {
  const fm = cmd?.frontmatter || {};
  const val = fm[key];
  if (val === undefined || val === null) return '—';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '—';
  return String(val);
}

function CompareTable({ cmdA, cmdB }) {
  const sectionsA = parseBodySections(cmdA.body || '');
  const sectionsB = parseBodySections(cmdB.body || '');
  const syntaxA = extractCodeBlock(sectionsA['Syntax'] || '');
  const syntaxB = extractCodeBlock(sectionsB['Syntax'] || '');

  const rows = [
    { label: 'Category', a: field(cmdA, 'category'), b: field(cmdB, 'category') },
    { label: 'Difficulty', a: field(cmdA, 'difficulty'), b: field(cmdB, 'difficulty') },
    { label: 'Supported OS', a: field(cmdA, 'supportedOS'), b: field(cmdB, 'supportedOS') },
    {
      label: 'Supported Shells',
      a: field(cmdA, 'supportedShells'),
      b: field(cmdB, 'supportedShells'),
    },
    { label: 'Syntax', a: syntaxA || '—', b: syntaxB || '—', mono: true },
    {
      label: 'What is it?',
      a: sectionsA['What is it?'] || '—',
      b: sectionsB['What is it?'] || '—',
      isMarkdown: true,
    },
    {
      label: 'Why does it exist?',
      a: sectionsA['Why does it exist?'] || '—',
      b: sectionsB['Why does it exist?'] || '—',
      isMarkdown: true,
    },
    {
      label: 'When NOT to use',
      a: sectionsA['When should it NOT be used?'] || '—',
      b: sectionsB['When should it NOT be used?'] || '—',
      isMarkdown: true,
    },
  ];

  const cellStyle = {
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'top',
    lineHeight: 1.5,
  };

  const labelStyle = {
    ...cellStyle,
    color: 'var(--text-muted)',
    fontWeight: 500,
    width: '140px',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      {/* Desktop Side-by-side Table (> 640px) */}
      <div className="cmp-table-desktop">
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <thead>
            <tr>
              <th style={{ ...labelStyle, borderBottom: '2px solid var(--border-subtle)' }}></th>
              <th
                style={{
                  ...cellStyle,
                  fontWeight: 500,
                  borderBottom: '2px solid var(--border-subtle)',
                }}
              >
                <Link
                  href={`/command/${cmdA.slug}`}
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                >
                  {cmdA.frontmatter?.name || cmdA.slug}
                </Link>
              </th>
              <th
                style={{
                  ...cellStyle,
                  fontWeight: 500,
                  borderBottom: '2px solid var(--border-subtle)',
                }}
              >
                <Link
                  href={`/command/${cmdB.slug}`}
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                >
                  {cmdB.frontmatter?.name || cmdB.slug}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td style={labelStyle}>{row.label}</td>
                <td
                  style={{
                    ...cellStyle,
                    fontFamily: row.mono ? 'var(--font-mono, monospace)' : 'inherit',
                    fontSize: row.mono ? '13px' : '14px',
                  }}
                >
                  {row.isMarkdown && row.a !== '—' ? (
                    <div
                      className="cmp-md"
                      dangerouslySetInnerHTML={{
                        __html: parseAndSanitizeMarkdown(row.a),
                      }}
                    />
                  ) : (
                    row.a
                  )}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    fontFamily: row.mono ? 'var(--font-mono, monospace)' : 'inherit',
                    fontSize: row.mono ? '13px' : '14px',
                  }}
                >
                  {row.isMarkdown && row.b !== '—' ? (
                    <div
                      className="cmp-md"
                      dangerouslySetInnerHTML={{
                        __html: parseAndSanitizeMarkdown(row.b),
                      }}
                    />
                  ) : (
                    row.b
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (<= 640px) */}
      <div className="cmp-cards-mobile">
        {rows.map((row) => (
          <div key={row.label} className="cmp-mobile-card">
            <h3 className="cmp-mobile-label">{row.label}</h3>
            <div className="cmp-mobile-col">
              <span className="cmp-mobile-cmd-name">{cmdA.frontmatter?.name || cmdA.slug}</span>
              {row.isMarkdown && row.a !== '—' ? (
                <div
                  className="cmp-md"
                  dangerouslySetInnerHTML={{
                    __html: parseAndSanitizeMarkdown(row.a),
                  }}
                />
              ) : (
                <div className={row.mono ? 'cmp-mono' : ''}>{row.a}</div>
              )}
            </div>
            <div className="cmp-mobile-col">
              <span className="cmp-mobile-cmd-name">{cmdB.frontmatter?.name || cmdB.slug}</span>
              {row.isMarkdown && row.b !== '—' ? (
                <div
                  className="cmp-md"
                  dangerouslySetInnerHTML={{
                    __html: parseAndSanitizeMarkdown(row.b),
                  }}
                />
              ) : (
                <div className={row.mono ? 'cmp-mono' : ''}>{row.b}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .cmp-table-desktop {
          display: block;
        }
        .cmp-cards-mobile {
          display: none;
          flex-direction: column;
          gap: 16px;
        }

        .cmp-mobile-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cmp-mobile-label {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin: 0 0 4px 0;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 8px;
        }

        .cmp-mobile-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cmp-mobile-cmd-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          font-family: var(--font-mono, monospace);
        }

        .cmp-mono {
          font-family: var(--font-mono, monospace);
          font-size: 13px;
        }

        .cmp-md p {
          margin: 0 0 8px 0;
        }
        .cmp-md p:last-child {
          margin: 0;
        }
        .cmp-md ul,
        .cmp-md ol {
          margin: 4px 0 8px 16px;
          padding: 0;
        }
        .cmp-md li {
          margin-bottom: 4px;
        }
        .cmp-md code {
          font-family: var(--font-mono, monospace);
          background-color: var(--bg-base);
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 13px;
        }
        .cmp-md strong,
        .cmp-md b {
          color: var(--text-primary);
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .cmp-table-desktop {
            display: none;
          }
          .cmp-cards-mobile {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}
