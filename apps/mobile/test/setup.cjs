const { jest: runner } = require('@jest/globals');

runner.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const values = new Map();
    return {
      getString: (key) => values.get(key),
      set: (key, value) => values.set(key, value),
      remove: (key) => values.delete(key),
    };
  },
}));

runner.mock('../src/theme/isTestBuild', () => ({ isTestBuild: true }));
runner.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }));
