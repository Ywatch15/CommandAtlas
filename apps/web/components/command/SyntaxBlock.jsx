'use client';
import { useState } from 'react';

export default function SyntaxBlock({ code, language = 'bash' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in non-secure contexts
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '16px',
        margin: 'var(--space-syntax-block) 0',
        fontFamily: 'var(--font-mono)',
        fontSize: '14px',
        overflowX: 'auto',
      }}
      className="syntax-block-container"
    >
      <pre style={{ margin: 0 }}>
        <code className={`language-${language}`} style={{ color: 'var(--text-primary)' }}>
          {code}
        </code>
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          right: '12px',
          top: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          color: 'var(--text-muted)',
          fontSize: '12px',
          padding: '4px 8px',
          cursor: 'pointer',
          display: 'none',
          transition: 'all 0.15s ease',
        }}
        className="copy-btn"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <style jsx>{`
        .syntax-block-container:hover .copy-btn {
          display: block !important;
        }
        .copy-btn:hover {
          color: var(--text-primary);
          border-color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
