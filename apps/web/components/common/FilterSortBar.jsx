'use client';

export default function FilterSortBar({
  sortBy,
  onSortChange,
  selectedDifficulties,
  onToggleDifficulty,
  onExpandAll = null,
  onCollapseAll = null,
  className = '',
}) {
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  return (
    <div className={`filter-sort-bar ${className}`}>
      <div className="filter-sort-controls">
        <div className="sort-control">
          <label htmlFor="sort-select" className="sort-label">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="sort-select"
          >
            <option value="topic">Topic (Grouped)</option>
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="diff-asc">Difficulty (Beginner → Advanced)</option>
            <option value="diff-desc">Difficulty (Advanced → Beginner)</option>
          </select>
        </div>

        <div className="diff-filter-group">
          <span className="sort-label">Difficulty:</span>
          <div className="difficulty-chips">
            {difficulties.map((diff) => {
              const isActive = selectedDifficulties.has(diff);
              return (
                <button
                  key={diff}
                  type="button"
                  className={`diff-chip ${isActive ? 'active' : ''}`}
                  onClick={() => onToggleDifficulty(diff)}
                  aria-pressed={isActive}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {onExpandAll && onCollapseAll && (
        <div className="global-expand-controls">
          <button type="button" className="action-link-btn" onClick={onExpandAll}>
            Expand All
          </button>
          <span className="divider">|</span>
          <button type="button" className="action-link-btn" onClick={onCollapseAll}>
            Collapse All
          </button>
        </div>
      )}

      <style jsx>{`
        .filter-sort-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 24px;
          gap: var(--space-component, 16px);
          flex-wrap: wrap;
        }

        .filter-sort-controls {
          display: flex;
          align-items: center;
          gap: var(--space-component, 16px);
          flex-wrap: wrap;
        }

        .sort-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .sort-select {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 6px 30px 6px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239AA1AC' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          transition: border-color 0.15s ease;
        }

        .sort-select:hover {
          border-color: var(--text-muted);
        }

        .sort-select:focus-visible {
          border-color: var(--accent);
          outline: 2px solid var(--accent);
          outline-offset: -1px;
        }

        .diff-filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .difficulty-chips {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .diff-chip {
          background-color: var(--bg-surface);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 5px 12px;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .diff-chip:hover {
          color: var(--text-primary);
          border-color: var(--text-muted);
        }

        .diff-chip.active {
          background-color: var(--bg-elevated);
          color: var(--accent);
          border-color: var(--accent);
          font-weight: 600;
        }

        .diff-chip:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -1px;
        }

        .global-expand-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .divider {
          color: var(--border-subtle);
          user-select: none;
        }

        .action-link-btn {
          background: transparent;
          border: none;
          color: var(--accent);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 6px;
          transition: color 0.15s ease;
        }

        .action-link-btn:hover {
          color: var(--accent);
          text-decoration: underline;
        }

        .action-link-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
          border-radius: 2px;
        }

        @media (max-width: 640px) {
          .filter-sort-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .filter-sort-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            width: 100%;
          }

          .sort-control {
            justify-content: space-between;
          }

          .sort-select {
            flex: 1;
          }

          .diff-filter-group {
            justify-content: space-between;
          }

          .global-expand-controls {
            margin-left: 0;
            justify-content: flex-end;
            border-top: 1px solid var(--border-subtle);
            padding-top: 8px;
          }
        }
      `}</style>
    </div>
  );
}
