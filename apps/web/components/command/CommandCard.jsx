import Link from 'next/link';
import BadgeGroup from './BadgeGroup.jsx';

export default function CommandCard({ slug, name, summary, difficulty, supportedOS, category }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: 'var(--space-component)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.15s ease',
      }}
      className="command-card-hover"
    >
      <Link href={`/command/${slug}`} style={{ textDecoration: 'none' }}>
        <h3
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--accent-primary)',
            cursor: 'pointer',
          }}
        >
          {name}
        </h3>
      </Link>
      {summary && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.45 }}>
          {summary}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <BadgeGroup difficulty={difficulty} supportedOS={supportedOS} />
        {category && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{category}</span>
        )}
      </div>
      <style jsx>{`
        .command-card-hover:hover {
          background-color: var(--bg-hover) !important;
          border-color: var(--border-section) !important;
        }
      `}</style>
    </div>
  );
}
