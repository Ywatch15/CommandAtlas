'use client';

export default function EmptySearchState({ query = '' }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-muted)',
      }}
    >
      {query ? (
        <>
          <p style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            No commands found matching &quot;{query}&quot;
          </p>
          <p style={{ fontSize: '13px' }}>
            Try checking for typos, searching for broader terms, or removing facet filters.
          </p>
        </>
      ) : (
        <p style={{ fontSize: '14px' }}>
          Type a command name, alias, or intent (e.g. &quot;search text&quot;) to start searching.
        </p>
      )}
    </div>
  );
}
