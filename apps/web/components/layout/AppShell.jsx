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
        <main
          style={{
            flex: 1,
            padding: 'var(--space-page)',
            overflowY: 'auto',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
