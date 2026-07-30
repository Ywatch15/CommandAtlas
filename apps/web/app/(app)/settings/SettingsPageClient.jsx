'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import { getPackStatus, downloadAndInstallPack, removePack } from '@/lib/db/packs.js';

export default function SettingsPageClient() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeOp, setActiveOp] = useState(null); // { packId, action, progress }

  const loadPacks = useCallback(async () => {
    try {
      const status = await getPackStatus();
      setPacks(status);
    } catch {
      // Offline or manifest unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const handleInstall = async (packId) => {
    setActiveOp({ packId, action: 'installing', progress: 0 });
    try {
      await downloadAndInstallPack(packId, {
        onProgress: (completed, total) => {
          setActiveOp((prev) =>
            prev ? { ...prev, progress: Math.round((completed / total) * 100) } : prev
          );
        },
      });
      await loadPacks();
    } catch (err) {
      setActiveOp({ packId, action: 'error', error: err.message });
      return;
    }
    setActiveOp(null);
  };

  const handleRemove = async (packId) => {
    setActiveOp({ packId, action: 'removing', progress: 0 });
    try {
      await removePack(packId);
      await loadPacks();
    } catch (err) {
      setActiveOp({ packId, action: 'error', error: err.message });
      return;
    }
    setActiveOp(null);
  };

  const handleUpdate = async (packId) => {
    await handleInstall(packId);
  };

  const handleInstallAll = async () => {
    const uninstalled = packs.filter((p) => !p.isInstalled);
    for (const pack of uninstalled) {
      await handleInstall(pack.packId);
    }
  };

  return (
    <AppShell>
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            Content Packs
          </h1>
          {packs.some((p) => !p.isInstalled) && (
            <button
              onClick={handleInstallAll}
              disabled={!!activeOp}
              style={{
                backgroundColor: 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: activeOp ? 'not-allowed' : 'pointer',
                opacity: activeOp ? 0.5 : 1,
              }}
            >
              Install All
            </button>
          )}
        </div>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          Install topic packs to make their commands available offline. Each pack is independently
          downloadable and removable.
        </p>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading pack status...</p>
        ) : packs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            No packs available. Run the content pipeline first.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {packs.map((pack) => {
              const isActive = activeOp?.packId === pack.packId;
              return (
                <div
                  key={pack.packId}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {pack.packId}
                      </span>
                      {pack.isInstalled && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--success)',
                            backgroundColor: 'rgba(63, 185, 80, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '2px',
                          }}
                        >
                          Installed v{pack.installedVersion}
                        </span>
                      )}
                      {pack.isUpdateAvailable && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--warning)',
                            backgroundColor: 'rgba(210, 153, 34, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '2px',
                          }}
                        >
                          Update v{pack.availableVersion}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {pack.size > 0 ? `${(pack.size / 1024).toFixed(1)} KB` : ''}
                    </span>

                    {/* Progress bar */}
                    {isActive && activeOp.action === 'installing' && (
                      <div
                        style={{
                          marginTop: '8px',
                          height: '4px',
                          backgroundColor: 'var(--bg-elevated)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${activeOp.progress}%`,
                            backgroundColor: 'var(--accent)',
                            borderRadius: '2px',
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    )}

                    {isActive && activeOp.action === 'error' && (
                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '12px',
                          color: 'var(--danger)',
                        }}
                      >
                        Error: {activeOp.error}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {!pack.isInstalled && (
                      <button
                        onClick={() => handleInstall(pack.packId)}
                        disabled={!!activeOp}
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: activeOp ? 'not-allowed' : 'pointer',
                          opacity: activeOp ? 0.5 : 1,
                        }}
                      >
                        Install
                      </button>
                    )}
                    {pack.isUpdateAvailable && (
                      <button
                        onClick={() => handleUpdate(pack.packId)}
                        disabled={!!activeOp}
                        style={{
                          backgroundColor: 'var(--warning)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: activeOp ? 'not-allowed' : 'pointer',
                          opacity: activeOp ? 0.5 : 1,
                        }}
                      >
                        Update
                      </button>
                    )}
                    {pack.isInstalled && (
                      <button
                        onClick={() => handleRemove(pack.packId)}
                        disabled={!!activeOp}
                        style={{
                          backgroundColor: 'transparent',
                          color: 'var(--danger)',
                          border: '1px solid var(--danger)',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: activeOp ? 'not-allowed' : 'pointer',
                          opacity: activeOp ? 0.5 : 1,
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
