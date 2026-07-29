'use client';
import { DIFFICULTY, SUPPORTED_OS } from '@commandatlas/shared/constants.js';

export default function FacetSidebar({ facets, onFacetChange, categories = [] }) {
  const handleCategoryChange = (e) => {
    onFacetChange({ ...facets, category: e.target.value || null });
  };

  const handleDifficultyChange = (e) => {
    onFacetChange({ ...facets, difficulty: e.target.value || null });
  };

  const handleOSChange = (os) => {
    const currentOS = facets.supportedOS || [];
    const updated = currentOS.includes(os)
      ? currentOS.filter((item) => item !== os)
      : [...currentOS, os];
    onFacetChange({ ...facets, supportedOS: updated.length > 0 ? updated : null });
  };

  return (
    <aside
      style={{
        width: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '16px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '4px',
        fontSize: '13px',
      }}
    >
      <div>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 500 }}>
          Category
        </h4>
        <select
          value={facets.category || ''}
          onChange={handleCategoryChange}
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '6px',
            fontSize: '13px',
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.frontmatter?.name || cat.name || cat.slug}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 500 }}>
          Difficulty
        </h4>
        <select
          value={facets.difficulty || ''}
          onChange={handleDifficultyChange}
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '6px',
            fontSize: '13px',
          }}
        >
          <option value="">All Difficulties</option>
          {Object.values(DIFFICULTY).map((diff) => (
            <option key={diff} value={diff}>
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 500 }}>
          Operating System
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.values(SUPPORTED_OS).map((os) => {
            const isChecked = (facets.supportedOS || []).includes(os);
            return (
              <label
                key={os}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleOSChange(os)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'uppercase' }}>{os}</span>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
