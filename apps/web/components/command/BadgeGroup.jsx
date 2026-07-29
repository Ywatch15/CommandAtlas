export default function BadgeGroup({ tags = [], difficulty, supportedOS = [] }) {
  return (
    <div
      style={{ display: 'flex', gap: 'var(--space-micro)', flexWrap: 'wrap', alignItems: 'center' }}
    >
      {difficulty && (
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            padding: '2px 6px',
            borderRadius: '2px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            textTransform: 'capitalize',
          }}
        >
          {difficulty}
        </span>
      )}
      {supportedOS.map((os) => (
        <span
          key={os}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            padding: '2px 6px',
            borderRadius: '2px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {os}
        </span>
      ))}
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            padding: '2px 6px',
            borderRadius: '2px',
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
