import Link from 'next/link';

/**
 * Right-rail component showing Related Commands and Alternatives.
 * UI_DESIGN_SYSTEM.md §8: ~30% right rail, stacks below on mobile.
 */
export default function RelatedCommandsRail({ relatedCommands = [], alternatives = [] }) {
  if (relatedCommands.length === 0 && alternatives.length === 0) return null;

  const linkStyle = {
    fontSize: '13px',
    fontFamily: 'var(--font-mono, monospace)',
    color: 'var(--accent)',
    textDecoration: 'none',
    padding: '4px 0',
    display: 'block',
  };

  const headingStyle = {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  };

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {relatedCommands.length > 0 && (
        <div>
          <h3 style={headingStyle}>Related Commands</h3>
          {relatedCommands.map((slug) => (
            <Link key={slug} href={`/command/${slug}`} style={linkStyle}>
              {slug}
            </Link>
          ))}
        </div>
      )}
      {alternatives.length > 0 && (
        <div>
          <h3 style={headingStyle}>Alternatives</h3>
          {alternatives.map((slug) => (
            <Link key={slug} href={`/command/${slug}`} style={linkStyle}>
              {slug}
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}
