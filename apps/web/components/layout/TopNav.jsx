'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchModal from '@/components/search/SearchModal.jsx';
import SyncStatusIndicator from '@/components/layout/SyncStatusIndicator.jsx';

export default function TopNav() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Global keydown handler for ⌘K and Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const navLinks = [
    { label: 'Categories', href: '/category/linux' },
    { label: 'Compare', href: '/compare' },
    { label: 'Interview', href: '/interview-prep' },
    { label: 'Practice', href: '/practice' },
    { label: 'Learning', href: '/learning' },
    { label: 'Bookmarks', href: '/bookmarks' },
    { label: 'Notes', href: '/notes' },
    { label: 'Profile', href: '/profile' },
    { label: 'Settings', href: '/settings' },
  ];

  return (
    <>
      <nav className="topnav">
        <div className="nav-left">
          <Link href="/" className="logo-link">
            Command<span style={{ color: 'var(--accent)' }}>Atlas</span>
          </Link>

          {/* Desktop/Tablet Search Trigger Pill */}
          <button
            className="search-pill-desktop"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search commands"
          >
            <span className="search-placeholder">Search commands...</span>
            <kbd className="search-kbd">⌘K</kbd>
          </button>
        </div>

        <div className="nav-right">
          {/* Desktop Navigation */}
          <div className="desktop-nav-content">
            <SyncStatusIndicator />
            <div className="desktop-links">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`nav-link ${isActive ? 'active' : 'inactive'}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile Search Button */}
          <button
            className="mobile-search-btn"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search commands"
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
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span className="mobile-search-text">Search</span>
          </button>

          {/* Mobile/Tablet Hamburger Toggle Button */}
          <button
            className="hamburger-btn"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile/Tablet Responsive Drawer & Backdrop */}
      {isMenuOpen && (
        <>
          <div className="menu-backdrop" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
          <div className="menu-drawer" role="dialog" aria-label="Mobile Navigation">
            <div className="drawer-sync-row">
              <span className="drawer-subtitle">Status</span>
              <SyncStatusIndicator />
            </div>
            <div className="drawer-links">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`drawer-link ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <style jsx>{`
        .topnav {
          height: 56px;
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-page);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 20px;
          flex: 1;
          min-width: 0;
        }

        .logo-link {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          text-decoration: none;
          letter-spacing: -0.02em;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .search-pill-desktop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 240px;
          max-width: 240px;
          flex-shrink: 1;
          background-color: var(--bg-base);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          text-align: left;
        }

        .search-placeholder {
          font-size: 13px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-kbd {
          font-family: var(--font-sans);
          font-size: 11px;
          color: var(--text-muted);
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 3px;
          padding: 1px 5px;
          flex-shrink: 0;
          margin-left: 8px;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 25px;
          flex-shrink: 0;
        }

        .desktop-nav-content {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .desktop-links {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .nav-link {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 4px;
          text-decoration: none;
          white-space: nowrap;
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }

        :global(.nav-link) {
          color: var(--text-muted) !important;
          text-decoration: none !important;
        }

        :global(.nav-link:hover) {
          background-color: var(--bg-elevated) !important;
          color: var(--text-primary) !important;
          text-decoration: none !important;
        }

        :global(.nav-link.active) {
          color: var(--text-primary) !important;
          background-color: var(--bg-elevated) !important;
          text-decoration: none !important;
          font-weight: 500;
        }

        :global(.logo-link) {
          color: var(--text-primary) !important;
          text-decoration: none !important;
        }

        :global(.logo-link:hover) {
          text-decoration: none !important;
        }

        .mobile-search-btn {
          display: none;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-base);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 6px 10px;
          color: var(--text-muted);
          font-size: 13px;
          cursor: pointer;
        }

        .hamburger-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background-color: var(--bg-base);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-primary);
          cursor: pointer;
        }

        .menu-backdrop {
          position: fixed;
          inset: 56px 0 0 0;
          background-color: rgba(0, 0, 0, 0.6);
          z-index: 99;
        }

        .menu-drawer {
          position: fixed;
          top: 56px;
          right: 0;
          width: 280px;
          max-width: 85vw;
          height: calc(100vh - 56px);
          background-color: var(--bg-surface);
          border-left: 1px solid var(--border-subtle);
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.4);
          z-index: 100;
          display: flex;
          flex-direction: column;
          padding: 16px 0;
          overflow-y: auto;
        }

        .drawer-sync-row {
          padding: 0 16px 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .drawer-subtitle {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .drawer-links {
          display: flex;
          flex-direction: column;
        }

        :global(.drawer-link) {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-muted) !important;
          text-decoration: none !important;
          display: flex;
          align-items: center;
          min-height: 44px;
          border-left: 3px solid transparent;
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }

        :global(.drawer-link.active) {
          color: var(--text-primary) !important;
          background-color: var(--bg-elevated) !important;
          border-left-color: var(--accent) !important;
          text-decoration: none !important;
        }

        :global(.drawer-link:hover) {
          background-color: var(--bg-elevated) !important;
          color: var(--text-primary) !important;
          text-decoration: none !important;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1023px) {
          .topnav {
            padding: 0 16px;
          }
          .desktop-nav-content {
            display: none;
          }
          .hamburger-btn {
            display: flex;
          }
          .search-pill-desktop {
            max-width: 180px;
          }
        }

        @media (max-width: 639px) {
          .search-pill-desktop {
            display: none;
          }
          .mobile-search-btn {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}
