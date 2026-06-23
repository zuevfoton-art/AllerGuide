const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const localNodeModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  localNodeModules,
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  react: path.resolve(localNodeModules, 'react'),
  'react-dom': path.resolve(localNodeModules, 'react-dom'),
  'react-native': path.resolve(localNodeModules, 'react-native'),
  'react-native-web': path.resolve(localNodeModules, 'react-native-web'),
  '@allerguide/core': path.resolve(workspaceRoot, 'packages/core'),
  '@allerguide/ai': path.resolve(workspaceRoot, 'packages/ai'),
};

const WEB_ONLY_STUBS = {
  'expo-location': path.resolve(projectRoot, 'src/stubs/expo-location-web-stub.js'),
  'i18next': path.resolve(projectRoot, 'src/stubs/i18next-stub.js'),
  'react-i18next': path.resolve(projectRoot, 'src/stubs/react-i18next-stub.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_ONLY_STUBS[moduleName]) {
    return { filePath: WEB_ONLY_STUBS[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
