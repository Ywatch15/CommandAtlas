export default function FlagTable({ flags = [] }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto', margin: '16px 0' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid var(--border-subtle)',
          fontSize: '14px',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <th
              style={{
                padding: '12px var(--space-component)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
              }}
            >
              Flag
            </th>
            <th
              style={{
                padding: '12px var(--space-component)',
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-primary)',
              }}
            >
              Description
            </th>
            <th
              style={{
                padding: '12px var(--space-component)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
              }}
            >
              Example
            </th>
          </tr>
        </thead>
        <tbody>
          {flags.map((item, index) => (
            <tr
              key={index}
              style={{
                borderBottom: index < flags.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <td
                style={{
                  padding: '12px var(--space-component)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent)',
                }}
              >
                {item.flag}
              </td>
              <td
                style={{
                  padding: '12px var(--space-component)',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-primary)',
                }}
              >
                {item.description}
              </td>
              <td
                style={{
                  padding: '12px var(--space-component)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                {item.example || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
