import Link from 'next/link';

export const metadata = {
  title: 'Offline | CommandAtlas',
  description: 'You are currently offline.',
};

export default function OfflinePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
        You are offline
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>
        CommandAtlas operates offline using IndexedDB static search indexes. Downloaded commands and
        search indexes remain available!
      </p>
      <Link
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          background: 'var(--accent-primary)',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Return Home
      </Link>
    </div>
  );
}
