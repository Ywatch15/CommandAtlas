import BadgeGroup from './BadgeGroup.jsx';

export default function CommandHeader({ name, aliases = [], difficulty, supportedOS, shell }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: 'var(--space-section)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <h1
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '32px',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {name}
        </h1>
        {aliases && aliases.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {aliases.map((alias) => (
              <span
                key={alias}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                alias: {alias}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <BadgeGroup difficulty={difficulty} supportedOS={supportedOS} />
        {shell && shell.length > 0 && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {shell.map((sh) => (
              <span
                key={sh}
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-elevated)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {sh}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
