import Link from 'next/link';

/**
 * Standardized Empty State Component.
 * UI_DESIGN_SYSTEM.md: Simple, high-trust, subtle surface container.
 */
export default function EmptyState({ title, message, actionLabel, onAction, href }) {
  return (
    <div
      style={{
        padding: '36px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        margin: '16px 0',
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h3>
      )}
      {message && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            margin: 0,
            maxWidth: '440px',
          }}
        >
          {message}
        </p>
      )}
      {actionLabel && (href || onAction) && (
        <div style={{ marginTop: '8px' }}>
          {href ? (
            <Link
              href={href}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              {actionLabel} &rarr;
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
