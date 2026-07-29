import AppShell from '@/components/layout/AppShell.jsx';

export default function LearningPage() {
  return (
    <AppShell>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 0' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 500, marginBottom: '16px' }}>Learning Paths</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Interactive learning paths are coming soon in Milestone 5.
        </p>
      </div>
    </AppShell>
  );
}
