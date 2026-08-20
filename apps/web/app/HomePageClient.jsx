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
      <div className="home-container">
        {/* Hero Section */}
        <div className="home-hero">
          <h1 className="hero-title">Developer Command Reference</h1>
          <p className="hero-subheading">
            Manually curated, high-trust documentation for the command line, fully functional
            offline.
          </p>

          {/* Pack Installation Section - Integrated with Hero */}
          <div className="pack-manager-card">
            <div className="pack-manager-header">
              <h2 className="pack-manager-title">Content Pack Manager</h2>
              <p className="pack-manager-desc">
                Install the Linux pack to populate the local IndexedDB database and enable fully
                offline page reading.
              </p>
            </div>
            <button
              onClick={() => handleInstallPack('linux')}
              disabled={status === 'installing'}
              className="install-pack-btn"
            >
              {status === 'installing' ? 'Installing Linux Pack...' : 'Install Linux Pack'}
            </button>

            {status === 'success' && (
              <div className="status-msg success">
                ✓ Linux Pack installed successfully to IndexedDB!
              </div>
            )}
            {status === 'error' && (
              <div className="status-msg danger">✗ Installation failed: {errorMsg}</div>
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="categories-section">
          <h2 className="section-title">Browse Categories</h2>
          <div className="category-grid">
            {staticAllCategories.map((cat) => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="category-card">
                <h3 className="card-title">{cat.frontmatter?.name || cat.name || cat.slug}</h3>
                <p className="card-desc">{cat.frontmatter?.description || cat.description || ''}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 40px;
          padding: 16px 0 32px 0;
        }

        .home-hero {
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-title {
          font-size: 32px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
          letter-spacing: -0.025em;
        }

        .hero-subheading {
          font-size: 15px;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto 24px auto;
        }

        .pack-manager-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .pack-manager-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
        }

        .pack-manager-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .pack-manager-desc {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.5;
          max-width: 500px;
        }

        .install-pack-btn {
          background-color: ${status === 'installing' ? 'var(--bg-elevated)' : 'var(--accent)'};
          color: ${status === 'installing' ? 'var(--text-muted)' : '#000'};
          border: none;
          border-radius: 4px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: ${status === 'installing' ? 'not-allowed' : 'pointer'};
          transition: background-color 0.15s ease;
        }

        .status-msg {
          font-size: 13px;
          font-weight: 500;
        }
        .status-msg.success {
          color: var(--success);
        }
        .status-msg.danger {
          color: var(--danger);
        }

        .categories-section {
          width: 100%;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }

        :global(.category-card) {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 18px 20px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: border-color 0.15s ease;
        }

        :global(.category-card:hover) {
          border-color: #4a525d !important;
        }

        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .card-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
          flex: 1;
        }

        @media (max-width: 768px) {
          .home-container {
            gap: 28px;
            padding: 8px 0 24px 0;
          }
          .hero-title {
            font-size: 26px;
          }
          .hero-subheading {
            font-size: 14px;
            margin-bottom: 20px;
          }
          .pack-manager-card {
            padding: 16px;
          }
          .category-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      `}</style>
    </AppShell>
  );
}
