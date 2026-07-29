'use client';
import Link from 'next/link';
import BadgeGroup from '../command/BadgeGroup.jsx';

export default function SearchResultRow({ command, onClick }) {
  if (!command) return null;

  const { slug, name, summary, category, difficulty, supportedOS } = command;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '4px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'border-color 0.15s ease',
      }}
      className="search-row-hover"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Link
          href={`/command/${slug}`}
          onClick={onClick}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--accent)',
            textDecoration: 'none',
          }}
        >
          {name || slug}
        </Link>
        {category && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{category}</span>
        )}
      </div>

      {summary && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {summary}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
        <BadgeGroup difficulty={difficulty} supportedOS={supportedOS} />
      </div>

      <style jsx>{`
        .search-row-hover:hover {
          border-color: #4a525d !important;
          background-color: var(--bg-elevated) !important;
        }
      `}</style>
    </div>
  );
}
