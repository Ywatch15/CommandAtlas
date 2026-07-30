import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';

export const metadata = {
  title: 'Offline — CommandAtlas',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <AppShell>
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}
        >
          You Are Currently Offline
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            lineHeight: 1.5,
          }}
        >
          CommandAtlas operates fully offline once command packs are downloaded. You can continue
          browsing previously cached command references, bookmarks, and notes.
        </p>
        <Link
          href="/"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Return to Home Page
        </Link>
      </div>
    </AppShell>
  );
}
