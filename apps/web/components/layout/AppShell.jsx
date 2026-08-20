'use client';
import TopNav from './TopNav.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell({ children, sidebarItems = null }) {
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
        {sidebarItems && <Sidebar items={sidebarItems} />}
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
