import Link from 'next/link';

/**
 * Right-rail component showing Related Commands and Alternatives.
 * UI_DESIGN_SYSTEM.md §8: ~30% right rail, stacks below on mobile.
 */
export default function RelatedCommandsRail({ relatedCommands = [], alternatives = [] }) {
  const relList = Array.isArray(relatedCommands) ? relatedCommands : [];
  const altList = Array.isArray(alternatives) ? alternatives : [];

  if (relList.length === 0 && altList.length === 0) return null;

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
      {relList.length > 0 && (
        <div>
          <h3 style={headingStyle}>Related Commands</h3>
          {relList.map((item) => {
            const itemSlug = typeof item === 'string' ? item : item?.slug;
            if (!itemSlug) return null;
            return (
              <Link key={itemSlug} href={`/command/${itemSlug}`} style={linkStyle}>
                {itemSlug}
              </Link>
            );
          })}
        </div>
      )}
      {altList.length > 0 && (
        <div>
          <h3 style={headingStyle}>Alternatives</h3>
          {altList.map((item) => {
            const itemSlug = typeof item === 'string' ? item : item?.slug;
            if (!itemSlug) return null;
            return (
              <Link key={itemSlug} href={`/command/${itemSlug}`} style={linkStyle}>
                {itemSlug}
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
