const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);

  defaultConfig.resolver.sourceExts.push('ts', 'tsx', 'cjs');
  defaultConfig.resolver.unstable_enablePackageExports = false;

  return defaultConfig;
})();
