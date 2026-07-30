'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { db } from '@/lib/db/index.js';
import { parseBodySections, parseAndSanitizeMarkdown } from '@/lib/markdown.js';

export default function InterviewPrepClient({
  currentSlug,
  staticAllCommands,
  staticAllCategories,
}) {
  const [allCommands, setAllCommands] = useState(staticAllCommands);
  const [allCategories, setAllCategories] = useState(staticAllCategories);

  useEffect(() => {
    async function loadLocal() {
      try {
        const localCmds = await db.commands.toArray();
        const localCats = await db.categories.toArray();
        if (localCmds.length > 0) setAllCommands(localCmds);
        if (localCats.length > 0) setAllCategories(localCats);
      } catch {
        /* fallback */
      }
    }
    loadLocal();
  }, []);

  const sidebarItems = allCategories.map((cat) => ({
    label: cat.frontmatter?.name || cat.name || cat.slug,
    href: `/category/${cat.slug}`,
  }));

  // Filter commands by category if currentSlug !== 'all'
  const filteredCommands =
    currentSlug === 'all'
      ? allCommands
      : allCommands.filter(
          (c) => (c.frontmatter?.category || c.category || '').split('/')[0] === currentSlug
        );

  // Group commands with non-empty "Interview Questions" section by category
  const grouped = {};
  for (const cmd of filteredCommands) {
    const sections = parseBodySections(cmd.body || '');
    const iq = sections['Interview Questions'];
    if (iq && iq.trim() && !iq.includes('Not applicable')) {
      const catKey = (cmd.frontmatter?.category || cmd.category || 'other').split('/')[0];
      if (!grouped[catKey]) grouped[catKey] = [];
      grouped[catKey].push({ cmd, questionHtml: parseAndSanitizeMarkdown(iq) });
    }
  }

  const categorySlugs = ['all', ...allCategories.map((c) => c.slug)];

  return (
    <AppShell sidebarItems={sidebarItems}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Interview Preparation
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Key interview questions grouped by topic to help you prepare for technical assessments.
        </p>

        {/* Category Topic Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '32px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
          }}
        >
          {categorySlugs.map((slug) => {
            const isActive = slug === currentSlug;
            return (
              <Link
                key={slug}
                href={`/interview-prep/${slug}`}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  textTransform: 'capitalize',
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                }}
              >
                {slug}
              </Link>
            );
          })}
        </div>

        {/* Content Grouped by Topic */}
        {Object.keys(grouped).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            No interview questions found for this topic.
          </p>
        ) : (
          Object.entries(grouped).map(([topic, items]) => (
            <div key={topic} style={{ marginBottom: '40px' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'var(--accent)',
                  textTransform: 'capitalize',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '8px',
                }}
              >
                {topic}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {items.map(({ cmd, questionHtml }) => (
                  <div
                    key={cmd.slug}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <Link
                        href={`/command/${cmd.slug}`}
                        style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          fontFamily: 'var(--font-mono, monospace)',
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                        }}
                      >
                        {cmd.frontmatter?.name || cmd.slug}
                      </Link>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-elevated)',
                          padding: '2px 8px',
                          borderRadius: '2px',
                        }}
                      >
                        {cmd.frontmatter?.difficulty || 'intermediate'}
                      </span>
                    </div>
                    <div
                      className="markdown-body"
                      dangerouslySetInnerHTML={{ __html: questionHtml }}
                      style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
