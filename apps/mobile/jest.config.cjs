const preset = require('jest-expo/jest-preset');

module.exports = {
  ...preset,
  // Absolute globs can misinterpret dot-prefixed directories in Windows worktrees.
  testMatch: ['**/test/**/*.jest.tsx'],
  passWithNoTests: false,
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@adwam/core$': '<rootDir>/../../packages/core/src/index.ts',
  },
  transformIgnorePatterns: preset.transformIgnorePatterns.map((pattern) => pattern.replace('(.pnpm|', '(.pnpm|@formatjs|')),
  setupFilesAfterEnv: [...(preset.setupFilesAfterEnv ?? []), '<rootDir>/test/setup.cjs'],
};
