// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const restrict = (patterns, message) => ({
  patterns: [{ group: patterns, message }],
});

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/build/**',
      '**/.react-router/**',
      'examples/*/public/**',
      'playwright-report/**',
      'test-results/**',
      '**/next-env.d.ts',
      'packages/react-native/src/generated/runtime.js',
      'examples/expo-app/.expo/**',
      'rawVideos/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // Tests may use non null assertions on fixtures.
  {
    files: ['**/test/**', '**/*.test.ts', '**/*.test.tsx', 'e2e/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },

  // ---------------------------------------------------------------------------
  // Layer rules: a layer may only import from layers with a lower number.
  // core (1 domain, 2 validation/state/math/events, 3 anchors/assets) -> web (4) -> react (5, 6)
  // ---------------------------------------------------------------------------
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        restrict(
          ['@tryonit/web', '@tryonit/react', 'react', 'react-dom', 'three', '@mediapipe/*'],
          'core is platform agnostic: it must not import web, react, three or MediaPipe.',
        ),
      ],
    },
  },
  {
    files: ['packages/core/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        restrict(
          [
            '../validation/*',
            '../state/*',
            '../math/*',
            '../anchors/*',
            '../assets/*',
            '../events/*',
          ],
          'domain (layer 1) may only import from domain.',
        ),
      ],
    },
  },
  {
    files: [
      'packages/core/src/validation/**/*.ts',
      'packages/core/src/state/**/*.ts',
      'packages/core/src/math/**/*.ts',
      'packages/core/src/events/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        restrict(
          ['../anchors/*', '../assets/*'],
          'layer 2 may not import from layer 3 (anchors, assets).',
        ),
      ],
    },
  },
  {
    files: ['packages/web/src/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'web never imports React.' },
            { name: 'react-dom', message: 'web never imports React.' },
            { name: '@tryonit/react', message: 'web (layer 4) may not import react (layer 5).' },
            {
              name: 'three',
              message: 'three.js must only be loaded through dynamic import() in renderers/three.',
              allowTypeImports: true,
            },
            {
              name: '@mediapipe/tasks-vision',
              message: 'MediaPipe must be loaded lazily through trackers/vision-runtime.ts.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['three/*'],
              message: 'three.js addons must only be imported in renderers/three.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/web/src/renderers/three/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { paths: [{ name: 'react', message: 'web never imports React.' }] },
      ],
    },
  },
  {
    // React Native side: talks to the camera page only through the message bridge.
    files: ['packages/react-native/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        restrict(
          ['@tryonit/web', '@tryonit/react', 'react-dom', 'three', 'three/*', '@mediapipe/*'],
          'react-native code runs on the device JS engine: use @tryonit/core and the WebView bridge.',
        ),
      ],
    },
  },
  {
    files: ['packages/react/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        restrict(
          ['three', 'three/*', '@mediapipe/*'],
          'react (layers 5 and 6) talks to the engine through @tryonit/web only.',
        ),
      ],
    },
  },
);
