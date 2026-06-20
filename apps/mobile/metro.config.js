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

module.exports = config;
