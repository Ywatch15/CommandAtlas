'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { downloadAndInstallPack } from '@/lib/db/packs.js';
import BadgeGroup from '@/components/command/BadgeGroup.jsx';

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

          {/* Pack Installation Section */}
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
                <div className="card-top-row">
                  <h3 className="card-title">{cat.frontmatter?.name || cat.name || cat.slug}</h3>
                  <BadgeGroup tags={[cat.slug]} />
                </div>
                <p className="card-desc">{cat.frontmatter?.description || cat.description || ''}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 36px;
          padding: 8px 0 32px 0;
        }

        .home-hero {
          text-align: center;
          max-width: 680px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-title {
          font-size: 28px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .hero-subheading {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 560px;
          margin: 0 auto 20px auto;
        }

        .pack-manager-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          max-width: 560px;
          margin: 0 auto;
        }

        .pack-manager-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
        }

        .pack-manager-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .pack-manager-desc {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.45;
          max-width: 480px;
        }

        .install-pack-btn {
          background-color: ${status === 'installing' ? 'var(--bg-elevated)' : 'var(--accent)'};
          color: ${status === 'installing' ? 'var(--text-muted)' : '#000'};
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
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
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 14px;
          letter-spacing: -0.01em;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }

        :global(.category-card) {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 16px 18px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
          transition: border-color 0.15s ease;
        }

        :global(.category-card:hover) {
          border-color: #4a525d !important;
        }

        :global(.card-top-row) {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--accent);
          margin: 0;
        }

        .card-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.45;
          margin: 0;
          flex: 1;
        }

        @media (max-width: 768px) {
          .home-container {
            gap: 24px;
            padding: 4px 0 20px 0;
          }
          .hero-title {
            font-size: 24px;
          }
          .hero-subheading {
            font-size: 13px;
            margin-bottom: 16px;
          }
          .pack-manager-card {
            padding: 14px;
          }
          .category-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>
    </AppShell>
  );
}
