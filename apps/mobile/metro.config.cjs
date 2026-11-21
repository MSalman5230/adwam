const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const contentBuild = resolve(__dirname, '../../packages/content/scripts/build.ts');
const args = [contentBuild, '--mobile'];
if (process.env.APP_VARIANT !== 'production') args.push('--include-review');
execFileSync(process.execPath, args, { stdio: 'inherit' });

module.exports = getSentryExpoConfig(__dirname);
