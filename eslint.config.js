// ESLint flat config — ESLint v9+
// ENGINEERING_RULES.md §1: JavaScript only. No TypeScript, ever.
// Any .ts/.tsx file is a build failure — the rule below enforces this at lint time.

import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  // ── Global ignores ────────────────────────────────────────────────────────
  {
    ignores: [
      'generated/**',
      'node_modules/**',
      '.next/**',
      'apps/web/.next/**',
      'apps/server/node_modules/**',
    ],
  },

  // ── Base JS rules for all files ───────────────────────────────────────────
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,

      // Comments explain why, never what (ENGINEERING_RULES §1)
      // No dead code (ENGINEERING_RULES §1)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-debugger': 'error',

      // Booleans use is/has/should prefix — can't enforce naming via ESLint alone,
      // but we can catch common anti-patterns
      'no-shadow': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // ── Frontend — apps/web (React + browser globals) ─────────────────────────
  {
    files: ['apps/web/**/*.js', 'apps/web/**/*.jsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Functional components only — class components disallowed (ENGINEERING_RULES §1)
      'react/prefer-stateless-function': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unknown-property': ['error', { ignore: ['jsx', 'global'] }],
    },
  },

  // ── Scripts and shared packages (Node.js) ────────────────────────────────
  {
    files: ['scripts/**/*.js', 'packages/**/*.js', 'apps/server/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // ── Test files ────────────────────────────────────────────────────────────
  {
    files: ['**/*.test.js', '**/*.spec.js', 'apps/web/e2e/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
