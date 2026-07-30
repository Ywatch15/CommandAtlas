'use client';
import { useState, useEffect } from 'react';
import { getNote, saveNote } from '@/lib/db/user-data.js';

export default function NoteEditor({ commandSlug }) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!commandSlug) return;
      const text = await getNote(commandSlug);
      if (mounted) {
        setNoteText(text || '');
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [commandSlug]);

  async function handleSave() {
    if (!commandSlug) return;
    setSaving(true);
    await saveNote(commandSlug, noteText);
    setSaving(false);
    setStatusMsg('Saved');
    setTimeout(() => setStatusMsg(''), 2000);
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '4px',
        padding: '16px',
        marginTop: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          Personal Notes (Plain Text Only)
        </h3>
        {statusMsg && (
          <span style={{ fontSize: '12px', color: 'var(--success)' }}>{statusMsg}</span>
        )}
      </div>

      {/* ADR-010: Plain text textarea only — no HTML/Markdown rendering */}
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Add personal notes or annotations for this command..."
        rows={4}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          padding: '10px',
          fontSize: '13px',
          fontFamily: 'var(--font-mono, monospace)',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--accent)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </div>
  );
}
