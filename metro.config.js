const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Only block better-sqlite3 (Node.js only, not needed in React Native)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'better-sqlite3') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;