export default function BadgeGroup({ tags = [], difficulty, supportedOS = [] }) {
  const osList = Array.isArray(supportedOS)
    ? supportedOS
    : typeof supportedOS === 'string'
      ? [supportedOS]
      : [];
  const tagList = Array.isArray(tags) ? tags : typeof tags === 'string' ? [tags] : [];

  const getDifficultyStyle = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'intermediate' || d === 'med') {
      return {
        color: 'var(--tag-diff-med)',
        backgroundColor: 'var(--tag-diff-bg)',
        border: '1px solid rgba(227, 179, 65, 0.25)',
      };
    }
    if (d === 'beginner') {
      return {
        color: '#3FB950',
        backgroundColor: 'rgba(63, 185, 80, 0.12)',
        border: '1px solid rgba(63, 185, 80, 0.25)',
      };
    }
    if (d === 'advanced') {
      return {
        color: '#F85149',
        backgroundColor: 'rgba(248, 81, 73, 0.12)',
        border: '1px solid rgba(248, 81, 73, 0.25)',
      };
    }
    return {
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-tag-gap, 0.5rem)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {difficulty && (
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            padding: '3px 8px',
            borderRadius: '4px',
            textTransform: 'capitalize',
            ...getDifficultyStyle(difficulty),
          }}
        >
          {difficulty}
        </span>
      )}
      {osList.map((os) => (
        <span
          key={os}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {os}
        </span>
      ))}
      {tagList.map((tag) => (
        <span
          key={tag}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
