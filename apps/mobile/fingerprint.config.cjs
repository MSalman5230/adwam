// Sentry's build-time upload settings come from each machine's environment: GitHub, EAS and
// this PC set them differently. They decide where symbols are uploaded, not what native code
// the app contains, so the fingerprint leaves them out and every machine agrees on the runtime.

/** @type {import('expo/fingerprint').Config} */
const config = {
  fileHookTransform(source, chunk) {
    if (
      source.type !== 'contents' ||
      source.id !== 'expoConfig' ||
      typeof chunk !== 'string'
    )
      return chunk;
    const expoConfig = JSON.parse(chunk);
    expoConfig.plugins = expoConfig.plugins?.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === '@sentry/react-native/expo'
        ? [plugin[0], { url: plugin[1]?.url }]
        : plugin,
    );
    return JSON.stringify(expoConfig);
  },
};

module.exports = config;
