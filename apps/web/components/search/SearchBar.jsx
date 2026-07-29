'use client';
import { useState, useEffect } from 'react';

export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search commands (e.g. grep, copy file)...',
  autoFocus = false,
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 150); // 150ms debounce per ENGINEERING_RULES.md §10

    return () => clearTimeout(timer);
  }, [localValue, value, onChange]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          padding: '10px 14px',
          fontSize: '14px',
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
