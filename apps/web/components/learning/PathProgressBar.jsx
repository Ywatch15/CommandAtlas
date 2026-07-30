'use client';

export default function PathProgressBar({ completedCount, totalCount }) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginBottom: '6px',
        }}
      >
        <span>
          Progress: {completedCount} of {totalCount} steps completed
        </span>
        <span>{percent}%</span>
      </div>
      <div
        style={{
          height: '8px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            backgroundColor: 'var(--success)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
