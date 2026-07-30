'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { getCurrentUser, clearAuthSession } from '@/lib/auth.js';
import { getSyncStatus, triggerSync, SyncStatus } from '@/lib/db/sync.js';

export default function ProfilePageClient({ staticAllCategories }) {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatusState] = useState(SyncStatus.IDLE);
  const [mergedCount, setMergedCount] = useState(0);

  useEffect(() => {
    setUser(getCurrentUser());
    setSyncStatusState(getSyncStatus());
    const count = localStorage.getItem('commandatlas_last_merged_count');
    if (count) setMergedCount(parseInt(count, 10));
  }, []);

  function handleLogout() {
    clearAuthSession();
    setUser(null);
    window.location.href = '/login';
  }

  function handleManualSync() {
    triggerSync();
    setSyncStatusState(getSyncStatus());
  }

  const sidebarItems = (staticAllCategories || []).map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Account Profile &amp; Sync
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Manage your account credentials and cross-device sync settings.
        </p>

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '20px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>
                Account Information
              </h2>
              <p style={{ fontSize: '14px', margin: '4px 0', color: 'var(--text-primary)' }}>
                <strong>Name:</strong> {user.name || 'User'}
              </p>
              <p style={{ fontSize: '14px', margin: '4px 0', color: 'var(--text-primary)' }}>
                <strong>Email:</strong> {user.email}
              </p>

              <button
                onClick={handleLogout}
                style={{
                  marginTop: '16px',
                  backgroundColor: 'transparent',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </div>

            {/* Account Merge Confirmation (ARCHITECTURE §7 & ADR-009) */}
            {mergedCount > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(46, 160, 67, 0.1)',
                  border: '1px solid var(--success)',
                  color: 'var(--success)',
                  borderRadius: '4px',
                  padding: '16px',
                  fontSize: '14px',
                }}
              >
                ✓ Account Merge Confirmed: {mergedCount} pre-existing local item(s) were
                successfully merged into your account on first login with zero data loss.
              </div>
            )}

            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '20px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>
                Cross-Device Sync
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Status: <strong style={{ color: 'var(--text-primary)' }}>{syncStatus}</strong>
              </p>

              {syncStatus === SyncStatus.AUTH_EXPIRED && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(248, 81, 73, 0.1)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  Your session expired while offline. Local data is preserved. Please{' '}
                  <Link href="/login" style={{ color: 'var(--accent)' }}>
                    sign in again
                  </Link>{' '}
                  to resume cross-device sync.
                </div>
              )}

              <button
                onClick={handleManualSync}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Sync Now
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            You are using CommandAtlas offline with a local profile. Sign in or create an account
            for cross-device synchronization.
            <div
              style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}
            >
              <Link
                href="/login"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '13px',
                }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '13px',
                }}
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
