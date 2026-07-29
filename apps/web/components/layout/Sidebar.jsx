import Link from 'next/link';

export default function Sidebar({ items = [] }) {
  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-surface)',
        height: 'calc(100vh - 56px)',
        position: 'sticky',
        top: '56px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: item.active ? 'var(--text-primary)' : 'var(--text-muted)',
              borderLeft: item.active ? '2px solid var(--accent)' : '2px solid transparent',
              backgroundColor: item.active ? 'var(--bg-elevated)' : 'transparent',
              transition: 'all 0.15s ease',
            }}
            className={item.active ? '' : 'sidebar-item-hover'}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <style jsx>{`
        .sidebar-item-hover:hover {
          color: var(--text-primary) !important;
          background-color: var(--bg-base) !important;
        }
      `}</style>
    </aside>
  );
}
