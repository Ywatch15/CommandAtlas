'use client';
import { useState, useEffect } from 'react';

export default function InstallAppButton({ className = '', variant = 'pill' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = window.navigator.standalone === true;
      setIsStandalone(Boolean(isDisplayStandalone || isNavStandalone));
    };

    checkStandalone();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) && !/crios|fxios|edgios|chrome|android/.test(userAgent);
    setIsIOS(isAppleDevice && isSafari);

    // Listen for beforeinstallprompt (Android / Chromium desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  // If not iOS and no install prompt available yet, do not render unless in settings where instructions are helpful
  if (!deferredPrompt && !isIOS && variant !== 'settings') {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`install-app-btn ${variant} ${className}`}
        aria-label="Install CommandAtlas as Mobile App"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="install-icon"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span>Install App</span>
      </button>

      {/* iOS Safari Add-to-Home-Screen Instructions Modal */}
      {showIOSModal && (
        <div className="ios-modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div
            className="ios-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="ios-modal-header">
              <h3 className="ios-modal-title">Install CommandAtlas</h3>
              <button
                type="button"
                className="ios-modal-close"
                onClick={() => setShowIOSModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <p className="ios-modal-desc">
              To install CommandAtlas as a standalone app on your iPhone or iPad:
            </p>
            <ol className="ios-steps-list">
              <li>
                Tap the <strong>Share</strong> button{' '}
                <span className="ios-share-glyph" aria-hidden="true">
                  ⎋
                </span>{' '}
                in Safari&apos;s toolbar.
              </li>
              <li>
                Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>{' '}
                <span className="ios-add-glyph" aria-hidden="true">
                  ⊕
                </span>
                .
              </li>
              <li>
                Tap <strong>&quot;Add&quot;</strong> in the top-right corner.
              </li>
            </ol>
            <button
              type="button"
              className="ios-modal-done-btn"
              onClick={() => setShowIOSModal(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .install-app-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 500;
          transition: all 0.15s ease;
          border-radius: 4px;
        }

        .install-app-btn.pill {
          background-color: var(--bg-elevated);
          color: var(--accent);
          border: 1px solid var(--border-subtle);
          padding: 6px 12px;
          font-size: 13px;
          min-height: 36px;
        }

        .install-app-btn.pill:hover {
          background-color: var(--border-subtle);
          border-color: var(--accent);
        }

        .install-app-btn.drawer {
          width: 100%;
          background-color: var(--accent);
          color: #000;
          border: none;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          min-height: 44px;
          justify-content: center;
          margin-top: 8px;
        }

        .install-app-btn.drawer:hover {
          opacity: 0.9;
        }

        .install-app-btn.settings {
          background-color: var(--accent);
          color: #000;
          border: none;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          min-height: 44px;
        }

        .install-icon {
          flex-shrink: 0;
        }

        /* iOS Instructions Modal */
        .ios-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .ios-modal-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 20px;
          max-width: 360px;
          width: 100%;
          box-sizing: border-box;
          color: var(--text-primary);
        }

        .ios-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .ios-modal-title {
          font-size: 17px;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
        }

        .ios-modal-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }

        .ios-modal-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 14px;
        }

        .ios-steps-list {
          margin: 0 0 18px 0;
          padding-left: 20px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-primary);
        }

        .ios-steps-list li {
          margin-bottom: 8px;
        }

        .ios-share-glyph,
        .ios-add-glyph {
          display: inline-block;
          font-size: 15px;
          color: var(--accent);
          font-weight: bold;
        }

        .ios-modal-done-btn {
          width: 100%;
          background-color: var(--accent);
          color: #000;
          border: none;
          border-radius: 4px;
          padding: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          min-height: 44px;
        }
      `}</style>
    </>
  );
}
