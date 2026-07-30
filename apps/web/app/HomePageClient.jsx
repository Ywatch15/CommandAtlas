'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { downloadAndInstallPack } from '@/lib/db/packs.js';

export default function HomePageClient({ staticAllCategories }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleInstallPack = async (packId) => {
    setStatus('installing');
    setErrorMsg('');
    try {
      await downloadAndInstallPack(packId);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Unknown error');
    }
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CommandAtlas',
    url: 'https://commandatlas.dev',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://commandatlas.dev/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <AppShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
          padding: '40px 0',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}
          >
            Developer Command Reference
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            Manually curated, high-trust documentation for the command line, fully functional
            offline.
          </p>
        </div>

        {/* Pack Installation Demo Section */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Content Pack Manager
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              maxWidth: '500px',
            }}
          >
            Install the Linux pack to populate the local IndexedDB database and enable fully offline
            page reading.
          </p>

          <button
            onClick={() => handleInstallPack('linux')}
            disabled={status === 'installing'}
            style={{
              backgroundColor: status === 'installing' ? 'var(--bg-elevated)' : 'var(--accent)',
              color: status === 'installing' ? 'var(--text-muted)' : '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: status === 'installing' ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {status === 'installing' ? 'Installing Linux Pack...' : 'Install Linux Pack'}
          </button>

          {status === 'success' && (
            <div style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 500 }}>
              ✓ Linux Pack installed successfully to IndexedDB!
            </div>
          )}
          {status === 'error' && (
            <div style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: 500 }}>
              ✗ Installation failed: {errorMsg}
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '20px',
            }}
          >
            Browse Categories
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {staticAllCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '20px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color 0.15s ease',
                }}
                className="category-card"
              >
                <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--accent)' }}>
                  {cat.frontmatter?.name || cat.name || cat.slug}
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {cat.frontmatter?.description || cat.description || ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        :global(.category-card:hover) {
          border-color: #4a525d !important;
        }
      `}</style>
    </AppShell>
  );
}
