'use client';
import Link from 'next/link';

export default function WorkflowStepTimeline({ steps }) {
  if (!steps || !Array.isArray(steps)) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', margin: '32px 0' }}>
      {steps.map((step, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            gap: '16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {idx + 1}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
            >
              <Link
                href={`/command/${step.command}`}
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                {step.command}
              </Link>
            </div>

            {step.note && (
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {step.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
