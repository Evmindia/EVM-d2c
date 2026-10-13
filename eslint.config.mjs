import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

// ESLint 9 flat config. Next 16 removed `next lint`; eslint-config-next 16 ships
// native flat-config arrays, so we spread them directly (no FlatCompat bridge).
// Our TS rule overrides live in an object that registers the @typescript-eslint
// plugin, as flat config requires the plugin in the same config object.
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'next-env.d.ts',
      // Emulator tests need a running Firestore emulator + rules-unit-testing;
      // they are opt-in (RUN_EMULATOR_TESTS) and excluded from the standard gates.
      '**/*.emulator.test.ts',
    ],
  },
  ...next,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
];

export default config;
