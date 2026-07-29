'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchModal from '../search/SearchModal.jsx';

export default function TopNav() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsSearchOpen(true);
    window.addEventListener('open-search-modal', handleOpen);
    return () => window.removeEventListener('open-search-modal', handleOpen);
  }, []);

  const navLinks = [
    { label: 'Categories', href: '/category/linux' },
    { label: 'Learning', href: '/learning' },
    { label: 'Bookmarks', href: '/bookmarks' },
    { label: 'Profile', href: '/profile' },
  ];

  return (
    <>
      <nav
        style={{
          height: '56px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-page)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              letterSpacing: '-0.02em',
            }}
          >
            Command<span style={{ color: 'var(--accent)' }}>Atlas</span>
          </Link>

          {/* Global Search Pill */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '240px',
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onClick={() => setIsSearchOpen(true)}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Search commands...</span>
            <kbd
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '3px',
                padding: '1px 5px',
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                className={isActive ? '' : 'nav-link-hover'}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <style jsx>{`
          .nav-link-hover:hover {
            background-color: var(--bg-elevated) !important;
            color: var(--text-primary) !important;
          }
        `}</style>
      </nav>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
