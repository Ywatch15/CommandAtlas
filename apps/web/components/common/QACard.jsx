'use client';
import { useState } from 'react';
import Link from 'next/link';
import { parseAndSanitizeMarkdown } from '@/lib/markdown.js';

/**
 * Shared QACard component used by BOTH /interview-prep and /practice.
 * Supports:
 * - mode="interview": Collapsible command card with Q&A pairs
 * - mode="practice": Focused problem challenge with scenario, hint/solution disclosure, solved toggle, and footer nav
 */
export default function QACard({
  mode = 'interview',
  // Shared metadata
  title,
  commandSlug,
  difficulty = 'intermediate',
  topic,

  // Interview mode props
  isOpen = false,
  onToggle,
  qaPairs = [],

  // Practice mode props
  scenarioHtml,
  hintHtml,
  solutionHtml,
  isSolved = false,
  onToggleSolved,
  onBackToList,
  selectedIndex,
  totalCount,
  onPrev,
  onNext,
}) {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Render Interview Accordion Card
  if (mode === 'interview') {
    return (
      <div className={`qa-accordion-card ${isOpen ? 'open' : ''}`}>
        <div
          className="qa-accordion-header"
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onToggle) onToggle();
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={isOpen}
        >
          <div className="header-left">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="chevron-icon"
              style={{
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="qa-cmd-title">{title || commandSlug}</span>
          </div>

          <div className="header-right">
            <span className={`badge-difficulty difficulty-${difficulty.toLowerCase()}`}>
              {difficulty}
            </span>
            {commandSlug && (
              <Link
                href={`/command/${commandSlug}`}
                className="cmd-ref-link"
                onClick={(e) => e.stopPropagation()}
              >
                Ref &rarr;
              </Link>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="qa-accordion-body">
            {qaPairs.map((pair, idx) => (
              <div key={idx} className="iq-card">
                <div className="iq-question-block">
                  <span className="iq-q-prefix">Q:</span>
                  <span className="iq-q-text">{pair.question}</span>
                </div>
                <div className="iq-answer-block">
                  <span className="iq-a-prefix">A:</span>
                  <div
                    className="iq-a-text markdown-body"
                    dangerouslySetInnerHTML={{
                      __html: pair.answerHtml || parseAndSanitizeMarkdown(pair.answer),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <style jsx>{`
          .qa-accordion-card {
            background-color: var(--bg-elevated);
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            margin-bottom: 12px;
            overflow: hidden;
            transition: all 0.15s ease;
          }

          .qa-accordion-card:hover {
            border-color: var(--border-section);
          }

          .qa-accordion-card.open {
            border-color: var(--border-section);
          }

          .qa-accordion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            cursor: pointer;
            user-select: none;
            background-color: var(--bg-elevated);
            min-height: 44px;
            gap: 12px;
            transition: background-color 0.15s ease;
          }

          .qa-accordion-header:hover {
            background-color: var(--bg-hover);
          }

          .qa-accordion-header:focus-visible {
            outline: 2px solid var(--accent-primary);
            outline-offset: -1px;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
          }

          .chevron-icon {
            transition: transform 0.15s ease;
            flex-shrink: 0;
            color: var(--text-muted);
          }

          .qa-cmd-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
            font-family: var(--font-mono, monospace);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .cmd-ref-link {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-muted);
            text-decoration: none;
            padding: 4px 8px;
            min-height: 32px;
            display: inline-flex;
            align-items: center;
            border-radius: 3px;
            border: 1px solid transparent;
            transition: all 0.15s ease;
          }

          .cmd-ref-link:hover {
            color: var(--accent-primary);
            border-color: var(--border-subtle);
            background-color: var(--bg-hover);
          }

          .badge-difficulty {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.03em;
          }

          .difficulty-beginner {
            background-color: rgba(63, 185, 80, 0.12);
            color: #3fb950;
            border: 1px solid rgba(63, 185, 80, 0.25);
          }

          .difficulty-intermediate {
            background-color: var(--tag-diff-bg);
            color: var(--tag-diff-med);
            border: 1px solid rgba(227, 179, 65, 0.25);
          }

          .difficulty-advanced {
            background-color: rgba(248, 81, 73, 0.12);
            color: #f85149;
            border: 1px solid rgba(248, 81, 73, 0.25);
          }

          .qa-accordion-body {
            padding: 16px 18px;
            border-top: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            gap: 16px;
            background-color: var(--bg-canvas);
          }

          .iq-card {
            background-color: var(--bg-elevated);
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .iq-question-block {
            display: flex;
            align-items: baseline;
            gap: 8px;
          }

          .iq-q-prefix {
            color: var(--accent-primary);
            font-weight: 700;
            font-size: 15px;
            flex-shrink: 0;
          }

          .iq-q-text {
            color: var(--text-primary);
            font-weight: 600;
            font-size: 14px;
            line-height: 1.5;
          }

          .iq-answer-block {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            border-left: 2px solid var(--border-subtle);
            padding-left: 12px;
            margin-left: 2px;
          }

          .iq-a-prefix {
            color: var(--text-muted);
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .iq-a-text {
            color: var(--text-secondary);
            font-size: 13.5px;
            line-height: 1.6;
            flex: 1;
            min-width: 0;
            overflow-x: auto;
          }

          @media (max-width: 640px) {
            .qa-accordion-header {
              padding: 12px 14px;
            }

            .qa-accordion-body {
              padding: 12px 14px;
            }

            .iq-card {
              padding: 12px;
            }

            .qa-cmd-title {
              font-size: 14px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Render Practice Mode Problem Card
  return (
    <div className="qa-practice-card">
      <div className="card-top-bar">
        <div className="title-group">
          {onBackToList && (
            <button type="button" className="mobile-back-btn" onClick={onBackToList}>
              &larr; List
            </button>
          )}
          {topic && <span className="topic-tag">{topic}</span>}
          <h2 className="problem-cmd-title">{title || commandSlug}</h2>
        </div>

        <div className="actions-group">
          <span className={`badge-difficulty difficulty-${difficulty.toLowerCase()}`}>
            {difficulty}
          </span>
          {onToggleSolved && (
            <button
              type="button"
              className={`solved-toggle-btn ${isSolved ? 'is-solved' : ''}`}
              onClick={onToggleSolved}
            >
              {isSolved ? '✓ Solved' : 'Mark Solved'}
            </button>
          )}
        </div>
      </div>

      {/* Challenge Scenario */}
      {scenarioHtml && (
        <div className="scenario-section">
          <h3 className="section-label">Challenge Scenario</h3>
          <div
            className="markdown-body content-scroll"
            dangerouslySetInnerHTML={{ __html: scenarioHtml }}
          />
        </div>
      )}

      {/* Progressive Disclosure Actions */}
      <div className="disclosure-actions">
        {hintHtml && (
          <button
            type="button"
            className="disclosure-btn"
            onClick={() => setShowHint((prev) => !prev)}
          >
            {showHint ? 'Hide Hint 💡' : 'Reveal Hint 💡'}
          </button>
        )}
        {solutionHtml && (
          <button
            type="button"
            className="disclosure-btn solution"
            onClick={() => setShowSolution((prev) => !prev)}
          >
            {showSolution ? 'Hide Solution 🔑' : 'Reveal Solution 🔑'}
          </button>
        )}
      </div>

      {/* Hint Content */}
      {showHint && hintHtml && (
        <div className="disclosure-box hint-box">
          <h4 className="box-title">Hint</h4>
          <div
            className="markdown-body content-scroll"
            dangerouslySetInnerHTML={{ __html: hintHtml }}
          />
        </div>
      )}

      {/* Solution Content */}
      {showSolution && solutionHtml && (
        <div className="disclosure-box solution-box">
          <h4 className="box-title">Solution Reference</h4>
          <div
            className="markdown-body content-scroll"
            dangerouslySetInnerHTML={{ __html: solutionHtml }}
          />
        </div>
      )}

      {/* Footer Navigation */}
      {(onPrev || onNext) && (
        <div className="card-footer-nav">
          <button
            type="button"
            className="nav-btn"
            disabled={selectedIndex === 0}
            onClick={() => {
              if (onPrev) onPrev();
              setShowHint(false);
              setShowSolution(false);
            }}
          >
            &larr; Previous Problem
          </button>
          {totalCount !== undefined && (
            <span className="nav-counter">
              Problem {selectedIndex + 1} of {totalCount}
            </span>
          )}
          <button
            type="button"
            className="nav-btn"
            disabled={selectedIndex === totalCount - 1}
            onClick={() => {
              if (onNext) onNext();
              setShowHint(false);
              setShowSolution(false);
            }}
          >
            Next Problem &rarr;
          </button>
        </div>
      )}

      <style jsx>{`
        .qa-practice-card {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 24px;
          width: 100%;
          min-width: 0;
        }

        .card-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
          gap: 12px;
          flex-wrap: wrap;
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .mobile-back-btn {
          display: none;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 4px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--accent-primary);
          cursor: pointer;
          min-height: 44px;
        }

        .topic-tag {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--accent-primary);
          background-color: var(--accent-bg);
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .problem-cmd-title {
          font-size: 20px;
          font-weight: 600;
          font-family: var(--font-mono, monospace);
          color: var(--text-primary);
          margin: 0;
        }

        .badge-difficulty {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.03em;
        }

        .difficulty-beginner {
          background-color: rgba(63, 185, 80, 0.12);
          color: #3fb950;
          border: 1px solid rgba(63, 185, 80, 0.25);
        }

        .difficulty-intermediate {
          background-color: var(--tag-diff-bg);
          color: var(--tag-diff-med);
          border: 1px solid rgba(227, 179, 65, 0.25);
        }

        .difficulty-advanced {
          background-color: rgba(248, 81, 73, 0.12);
          color: #f85149;
          border: 1px solid rgba(248, 81, 73, 0.25);
        }

        .solved-toggle-btn {
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 500;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
          background-color: var(--bg-elevated);
          color: var(--text-muted);
          cursor: pointer;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s ease;
        }

        .solved-toggle-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-section);
          background-color: var(--bg-hover);
        }

        .solved-toggle-btn.is-solved {
          background-color: rgba(63, 185, 80, 0.12);
          color: #3fb950;
          border-color: rgba(63, 185, 80, 0.35);
          font-weight: 600;
        }

        .scenario-section {
          margin-bottom: 24px;
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .content-scroll {
          font-size: 14px;
          line-height: 1.65;
          color: var(--text-secondary);
          overflow-x: auto;
          max-width: 100%;
        }

        .disclosure-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .disclosure-btn {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
          background-color: var(--bg-elevated);
          color: var(--text-primary);
          cursor: pointer;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s ease;
        }

        .disclosure-btn:hover {
          border-color: var(--border-section);
          background-color: var(--bg-hover);
        }

        .disclosure-btn.solution {
          border-color: rgba(56, 189, 248, 0.4);
          color: var(--accent-primary);
        }

        .disclosure-box {
          background-color: var(--bg-recessed);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .hint-box {
          border-left: 3px solid var(--tag-diff-med);
        }

        .solution-box {
          border-left: 3px solid var(--accent-primary);
        }

        .box-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .card-footer-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 20px;
          margin-top: 24px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .nav-btn {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
          background-color: var(--bg-elevated);
          color: var(--text-primary);
          cursor: pointer;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s ease;
        }

        .nav-btn:hover:not(:disabled) {
          border-color: var(--text-muted);
        }

        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .nav-counter {
          font-size: 13px;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .qa-practice-card {
            padding: 16px;
          }

          .mobile-back-btn {
            display: inline-flex;
          }

          .card-top-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .actions-group {
            width: 100%;
            justify-content: space-between;
          }

          .card-footer-nav {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .nav-btn {
            justify-content: center;
            width: 100%;
          }

          .nav-counter {
            text-align: center;
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}
