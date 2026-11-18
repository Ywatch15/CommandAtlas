'use client';
import Link from 'next/link';
import BadgeGroup from '../command/BadgeGroup.jsx';
import { extractCommandSummary } from '@/lib/markdown.js';

export default function SearchResultRow({ command, onClick }) {
  if (!command) return null;

  const { slug, name, category, difficulty, supportedOS } = command;
  const summaryText = extractCommandSummary(command);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'all 0.15s ease',
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
            color: 'var(--accent-primary)',
            textDecoration: 'none',
          }}
        >
          {name || slug}
        </Link>
        {category && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{category}</span>
        )}
      </div>

      {summaryText && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          {summaryText}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
        <BadgeGroup difficulty={difficulty} supportedOS={supportedOS} />
      </div>

      <style jsx>{`
        .search-row-hover:hover {
          border-color: var(--border-section) !important;
          background-color: var(--bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
