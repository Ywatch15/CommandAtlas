import AppShell from '@/components/layout/AppShell.jsx';

export default function ProfilePage() {
  return (
    <AppShell>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 0' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 500, marginBottom: '16px' }}>Profile</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          User profiles and synchronization are coming soon in Milestone 7.
        </p>
      </div>
    </AppShell>
  );
}
