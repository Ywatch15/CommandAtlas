'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSyncStatus, subscribeSyncStatus, SyncStatus } from '@/lib/db/sync.js';

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState(SyncStatus.IDLE);

  useEffect(() => {
    setStatus(getSyncStatus());
    const unsubscribe = subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  if (status === SyncStatus.IDLE) return null;

  let label = 'Synced';
  let color = 'var(--success)';

  if (status === SyncStatus.SYNCING) {
    label = 'Syncing...';
    color = 'var(--warning)';
  } else if (status === SyncStatus.AUTH_EXPIRED) {
    label = 'Re-auth needed';
    color = 'var(--danger)';
  } else if (status === SyncStatus.OFFLINE) {
    label = 'Offline';
    color = 'var(--text-muted)';
  } else if (status === SyncStatus.ERROR) {
    label = 'Sync retrying...';
    color = 'var(--warning)';
  }

  return (
    <Link
      href="/profile"
      title={
        status === SyncStatus.AUTH_EXPIRED
          ? 'Token expired. Sign in again to resume sync.'
          : 'Sync Status'
      }
      style={{
        fontSize: '12px',
        color: color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        textDecoration: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
      <span>{label}</span>
    </Link>
  );
}
