const preset = require('jest-expo/jest-preset');

module.exports = {
  ...preset,
  testMatch: ['<rootDir>/test/**/*.jest.tsx'],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@adwam/core$': '<rootDir>/../../packages/core/src/index.ts',
  },
  transformIgnorePatterns: preset.transformIgnorePatterns.map((pattern) => pattern.replace('(.pnpm|', '(.pnpm|@formatjs|')),
  setupFilesAfterEnv: [...(preset.setupFilesAfterEnv ?? []), '<rootDir>/test/setup.cjs'],
};
