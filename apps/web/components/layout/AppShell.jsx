'use client';
import { useState, useEffect } from 'react';
import TopNav from './TopNav.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell({ children, sidebarItems = null }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <TopNav />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {sidebarItems && (
          <Sidebar items={sidebarItems} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        )}
        <main className="app-shell-main">{children}</main>
      </div>
      <style jsx>{`
        .app-shell-main {
          flex: 1;
          padding: var(--space-page);
          overflow-y: auto;
          min-width: 0;
        }
        @media (max-width: 768px) {
          .app-shell-main {
            padding: var(--space-page-mobile);
          }
        }
      `}</style>
    </div>
  );
}
