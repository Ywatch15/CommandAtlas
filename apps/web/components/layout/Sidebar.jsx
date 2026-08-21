'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sidebar — Hierarchical documentation tree explorer.
 *
 * Loads category + command data from the public pack JSON files
 * (same source as lib/content.js and IndexedDB sync) so the tree
 * renders on first paint without waiting for IndexedDB population.
 *
 * Props:
 *   items     — legacy flat list ({ label, href, active }[]), used as
 *               fallback while pack data loads.
 *   collapsed — controlled collapse state from AppShell.
 *   onToggleCollapse — callback to flip collapsed state in AppShell.
 */
export default function Sidebar({ items = [], collapsed = false, onToggleCollapse }) {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);
  const [commandsByCategory, setCommandsByCategory] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const activeCommandRef = useRef(null);

  // ── Close mobile drawer on route change ──────────────────────────
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // ── Load tree data from public pack files ────────────────────────
  useEffect(() => {
    let active = true;

    async function loadTreeData() {
      try {
        const manifestRes = await fetch('/manifests/latest.json');
        if (!manifestRes.ok) return;
        const manifest = await manifestRes.json();

        const allCats = [];
        const allCmds = [];
        const catSeen = new Set();

        const packPromises = (manifest.packs || []).map(async (entry) => {
          const packRes = await fetch(`/packs/commands/${entry.packId}.json`);
          if (!packRes.ok) return null;
          return packRes.json();
        });
        const packs = await Promise.all(packPromises);

        for (const pack of packs) {
          if (!pack) continue;
          for (const cat of pack.categories || []) {
            if (!catSeen.has(cat.slug)) {
              catSeen.add(cat.slug);
              allCats.push(cat);
            }
          }
          for (const cmd of pack.commands || []) {
            allCmds.push(cmd);
          }
        }

        if (!active) return;

        allCats.sort((a, b) => {
          const nameA = (a.frontmatter?.name || a.name || a.slug).toLowerCase();
          const nameB = (b.frontmatter?.name || b.name || b.slug).toLowerCase();
          return nameA.localeCompare(nameB);
        });

        const grouped = {};
        for (const cmd of allCmds) {
          const catKey = (cmd.frontmatter?.category || cmd.category || 'other').split('/')[0];
          if (!grouped[catKey]) grouped[catKey] = [];
          grouped[catKey].push(cmd);
        }
        for (const key of Object.keys(grouped)) {
          grouped[key].sort((a, b) => {
            const nameA = (a.frontmatter?.name || a.name || a.slug).toLowerCase();
            const nameB = (b.frontmatter?.name || b.name || b.slug).toLowerCase();
            return nameA.localeCompare(nameB);
          });
        }

        setCategories(allCats);
        setCommandsByCategory(grouped);
        setLoaded(true);
      } catch {
        // Fallback to items prop
      }
    }

    loadTreeData();
    return () => {
      active = false;
    };
  }, []);

  // ── Auto-expand current category from pathname ───────────────────
  useEffect(() => {
    if (!loaded) return;

    let currentCatSlug = '';

    if (pathname?.startsWith('/category/')) {
      currentCatSlug = pathname.replace('/category/', '').split('/')[0];
    } else if (pathname?.startsWith('/command/')) {
      const cmdSlug = pathname.replace('/command/', '');
      for (const [catSlug, cmds] of Object.entries(commandsByCategory)) {
        if (cmds.some((c) => c.slug === cmdSlug)) {
          currentCatSlug = catSlug;
          break;
        }
      }
    }

    if (currentCatSlug) {
      setExpandedCategories((prev) => {
        if (prev.has(currentCatSlug)) return prev;
        const next = new Set(prev);
        next.add(currentCatSlug);
        return next;
      });
    }
  }, [pathname, commandsByCategory, loaded]);

  // ── Scroll active command into view ──────────────────────────────
  useEffect(() => {
    if (activeCommandRef.current) {
      activeCommandRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pathname, expandedCategories]);

  // ── Toggle category expand/collapse ──────────────────────────────
  const toggleCategory = useCallback((catSlug, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catSlug)) {
        next.delete(catSlug);
      } else {
        next.add(catSlug);
      }
      return next;
    });
  }, []);

  // ── Shared tree renderer (used in both desktop + mobile) ─────────
  const renderTree = () => {
    if (categories.length > 0) {
      return categories.map((cat) => {
        const catSlug = cat.slug;
        const catName = cat.frontmatter?.name || cat.name || catSlug;
        const isCatActive = pathname === `/category/${catSlug}`;
        const isExpanded = expandedCategories.has(catSlug);
        const catCmds = commandsByCategory[catSlug] || [];
        const hasCmds = catCmds.length > 0;
        const sublistId = `sb-sub-${catSlug}`;

        // Determine if current command lives under this category
        const cmdSlugFromPath = pathname?.startsWith('/command/')
          ? pathname.replace('/command/', '')
          : null;
        const containsActiveCmd = cmdSlugFromPath
          ? catCmds.some((c) => c.slug === cmdSlugFromPath)
          : false;

        return (
          <div key={catSlug} className="sb-cat">
            <div
              className={
                'sb-cat-row' +
                (isCatActive ? ' sb-cat-current' : '') +
                (containsActiveCmd ? ' sb-cat-parent-active' : '')
              }
            >
              {hasCmds ? (
                <button
                  type="button"
                  className="sb-chevron"
                  onClick={(e) => toggleCategory(catSlug, e)}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${catName}`}
                  aria-expanded={isExpanded}
                  aria-controls={sublistId}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className={'sb-chev-svg' + (isExpanded ? ' sb-chev-open' : '')}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : (
                <span className="sb-chev-space" />
              )}
              <Link
                href={`/category/${catSlug}`}
                className={'sb-cat-link' + (isCatActive ? ' sb-cat-link-active' : '')}
              >
                {catName}
              </Link>
            </div>

            {isExpanded && hasCmds && (
              <div
                className="sb-cmd-list"
                id={sublistId}
                role="group"
                aria-label={`${catName} commands`}
              >
                {catCmds.map((cmd) => {
                  const cmdSlug = cmd.slug;
                  const isCmdActive = pathname === `/command/${cmdSlug}`;
                  const cmdName = cmd.frontmatter?.name || cmd.name || cmdSlug;
                  return (
                    <Link
                      key={cmdSlug}
                      href={`/command/${cmdSlug}`}
                      className={'sb-cmd' + (isCmdActive ? ' sb-cmd-active' : '')}
                      ref={isCmdActive ? activeCommandRef : undefined}
                    >
                      {cmdName}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      });
    }

    // Fallback: flat list while pack data loads
    return items.map((item) => {
      const isActive = item.active || pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={'sb-flat-link' + (isActive ? ' sb-flat-active' : '')}
        >
          {item.label}
        </Link>
      );
    });
  };

  // ── Collapse/expand chevron icon (desktop only) ──────────────────
  const CollapseIcon = ({ pointLeft }) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {pointLeft ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className={'sb' + (collapsed ? ' sb-collapsed' : '')}>
        {collapsed ? (
          /* Collapsed rail — just an expand button */
          <button
            type="button"
            className="sb-rail-expand"
            onClick={onToggleCollapse}
            aria-label="Expand documentation sidebar"
            title="Expand sidebar"
          >
            <CollapseIcon pointLeft={false} />
          </button>
        ) : (
          <>
            {/* Header row */}
            <div className="sb-head">
              <span className="sb-head-label">Documentation Tree</span>
              <button
                type="button"
                className="sb-collapse-btn"
                onClick={onToggleCollapse}
                aria-label="Collapse documentation sidebar"
                title="Collapse sidebar"
              >
                <CollapseIcon pointLeft={true} />
              </button>
            </div>
            {/* Tree nav */}
            <nav className="sb-nav" aria-label="Documentation navigation">
              {renderTree()}
            </nav>
          </>
        )}
      </aside>

      {/* ── Mobile bottom-sheet trigger + drawer (≤ 768px) ────────── */}
      <div className="sb-m-trigger-bar">
        <button
          type="button"
          className="sb-m-trigger"
          onClick={() => setIsMobileOpen((v) => !v)}
          aria-expanded={isMobileOpen}
          aria-label="Open documentation tree"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>Documentation Tree</span>
        </button>
      </div>

      {isMobileOpen && (
        <div className="sb-m-backdrop" onClick={() => setIsMobileOpen(false)} aria-hidden="true" />
      )}

      <div className={'sb-m-sheet' + (isMobileOpen ? ' sb-m-sheet-open' : '')}>
        <div className="sb-m-sheet-handle" />
        <div className="sb-m-sheet-head">
          <span className="sb-head-label">Documentation Tree</span>
          <button
            type="button"
            className="sb-m-close"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close documentation tree"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="sb-m-nav" aria-label="Documentation navigation">
          {renderTree()}
        </nav>
      </div>

      <style jsx>{`
        /* ============================================================
           DESKTOP SIDEBAR
           ============================================================ */
        .sb {
          width: 250px;
          background-color: var(--bg-surface);
          height: calc(100vh - 56px);
          position: sticky;
          top: 56px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          z-index: 90;
          overflow: hidden;
          transition: width 0.15s ease;
        }

        .sb-collapsed {
          width: 40px;
        }

        /* ── Header ──────────────────────────────────────────── */
        .sb-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 10px 8px 14px;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .sb-head-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .sb-collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          background: none;
          border: none;
          border-radius: 4px;
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;
        }
        .sb-collapse-btn:hover {
          color: var(--text-primary);
        }
        .sb-collapse-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -1px;
        }

        /* ── Collapsed rail ──────────────────────────────────── */
        .sb-rail-expand {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 40px;
          margin-top: 8px;
          padding: 0;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .sb-rail-expand:hover {
          color: var(--text-primary);
        }
        .sb-rail-expand:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -1px;
        }

        /* ── Nav scroll container ────────────────────────────── */
        .sb-nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 4px 0;
        }

        /* ── Category ────────────────────────────────────────── */
        .sb-cat {
          display: flex;
          flex-direction: column;
        }

        .sb-cat-row {
          display: flex;
          align-items: center;
          padding: 5px 12px 5px 10px;
          gap: 0;
          border-left: 2px solid transparent;
        }
        .sb-cat-row:hover {
          background-color: var(--bg-elevated);
        }
        .sb-cat-row.sb-cat-current {
          border-left-color: var(--accent);
          background-color: var(--bg-elevated);
        }
        .sb-cat-row.sb-cat-parent-active {
          border-left-color: var(--accent);
        }

        /* ── Chevron toggle ──────────────────────────────────── */
        .sb-chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          padding: 0;
          margin: 0;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;
          border-radius: 2px;
        }
        .sb-chevron:hover {
          color: var(--text-primary);
        }
        .sb-chevron:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -1px;
        }

        .sb-chev-space {
          width: 18px;
          flex-shrink: 0;
        }

        :global(.sb-chev-svg) {
          transition: transform 0.12s ease;
          transform: rotate(0deg);
        }
        :global(.sb-chev-svg.sb-chev-open) {
          transform: rotate(90deg);
        }

        /* ── Category link ───────────────────────────────────── */
        :global(.sb-cat-link) {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary) !important;
          text-decoration: none !important;
          padding: 2px 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.sb-cat-link:hover) {
          color: var(--accent) !important;
        }
        :global(.sb-cat-link.sb-cat-link-active) {
          color: var(--accent) !important;
          font-weight: 600;
        }

        /* ── Command child list ──────────────────────────────── */
        .sb-cmd-list {
          display: flex;
          flex-direction: column;
          margin-left: 20px;
          padding: 2px 0 4px 0;
          border-left: 1px solid var(--border-subtle);
        }

        :global(.sb-cmd) {
          display: block;
          font-size: 13px;
          font-family: var(--font-mono, 'SFMono-Regular', Consolas, monospace);
          padding: 4px 8px 4px 12px;
          color: var(--text-muted) !important;
          text-decoration: none !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-left: 2px solid transparent;
          margin-left: -1px;
        }
        :global(.sb-cmd:hover) {
          color: var(--text-primary) !important;
          background-color: var(--bg-elevated) !important;
        }
        :global(.sb-cmd.sb-cmd-active) {
          color: var(--accent) !important;
          border-left-color: var(--accent) !important;
          background-color: var(--bg-elevated) !important;
          font-weight: 500;
        }

        /* ── Fallback flat list ──────────────────────────────── */
        :global(.sb-flat-link) {
          display: flex;
          align-items: center;
          padding: 6px 14px;
          text-decoration: none !important;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted) !important;
          border-left: 2px solid transparent;
        }
        :global(.sb-flat-link:hover) {
          color: var(--text-primary) !important;
          background-color: var(--bg-elevated) !important;
        }
        :global(.sb-flat-link.sb-flat-active) {
          color: var(--text-primary) !important;
          border-left-color: var(--accent) !important;
          background-color: var(--bg-elevated) !important;
        }

        /* ============================================================
           MOBILE BOTTOM-SHEET
           ============================================================ */
        .sb-m-trigger-bar {
          display: none;
        }

        .sb-m-backdrop {
          display: none;
        }

        .sb-m-sheet {
          display: none;
        }

        @media (max-width: 768px) {
          /* Hide desktop sidebar entirely on mobile */
          .sb {
            display: none;
          }

          .sb-m-trigger-bar {
            display: block;
            padding: 8px 16px;
            background-color: var(--bg-surface);
            border-bottom: 1px solid var(--border-subtle);
          }

          .sb-m-trigger {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            background: none;
            border: 1px solid var(--border-subtle);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
            cursor: pointer;
          }
          .sb-m-trigger svg {
            transition: transform 0.15s ease;
          }
          .sb-m-trigger[aria-expanded='true'] svg {
            transform: rotate(90deg);
          }

          .sb-m-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 199;
          }

          .sb-m-sheet {
            display: flex;
            flex-direction: column;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            max-height: 70vh;
            background-color: var(--bg-surface);
            border-top: 1px solid var(--border-subtle);
            border-radius: 12px 12px 0 0;
            z-index: 200;
            transform: translateY(100%);
            transition: transform 0.2s ease;
          }

          .sb-m-sheet.sb-m-sheet-open {
            transform: translateY(0);
          }

          .sb-m-sheet-handle {
            width: 36px;
            height: 4px;
            background-color: var(--border-subtle);
            border-radius: 2px;
            margin: 8px auto 0;
            flex-shrink: 0;
          }

          .sb-m-sheet-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 14px;
            border-bottom: 1px solid var(--border-subtle);
            flex-shrink: 0;
          }

          .sb-m-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            padding: 0;
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            border-radius: 4px;
          }
          .sb-m-close:hover {
            color: var(--text-primary);
          }

          .sb-m-nav {
            flex: 1;
            overflow-y: auto;
            padding: 4px 0 16px;
            -webkit-overflow-scrolling: touch;
          }

          /* Increase touch targets on mobile */
          .sb-cat-row {
            padding: 8px 16px 8px 12px;
            min-height: 44px;
          }

          :global(.sb-cmd) {
            padding: 6px 12px 6px 16px;
            min-height: 44px;
            display: flex;
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}
