import js from '@eslint/js';
import i18next from 'eslint-plugin-i18next';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.expo/**',
      '**/android/**',
      '**/ios/**',
      '**/coverage/**',
      'supabase/functions/_shared/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['*.mjs', 'scripts/**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react(?:-native)?|expo(?:-[^/]+)?|@expo/[^/]+|@supabase/[^/]+|node:[^/]+)(?:/|$)',
              message: 'Core runs in Hermes, Deno, and Node with no platform dependencies.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          globals: [
            'fetch',
            'localStorage',
            'sessionStorage',
            'indexedDB',
            'navigator',
            'window',
            'document',
            'XMLHttpRequest',
            'WebSocket',
            'process',
            'Deno',
          ],
          checkGlobalObject: true,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Date"][arguments.length=0], CallExpression[callee.name="Date"]',
          message: 'Pass the current instant into core explicitly.',
        },
        {
          selector: 'MemberExpression[object.name="Date"][property.name="now"], MemberExpression[object.name="Date"][property.value="now"]',
          message: 'Pass the current instant into core explicitly.',
        },
        {
          selector: 'MemberExpression[object.name="Math"][property.name="random"], MemberExpression[object.name="Math"][property.value="random"]',
          message: 'Core calculations must be deterministic.',
        },
      ],
    },
  },
  {
    files: ['apps/mobile/src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },
);
