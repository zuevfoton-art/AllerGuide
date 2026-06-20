const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const localNodeModules = path.resolve(__dirname, 'node_modules');

config.resolver.extraNodeModules = {
  react: path.resolve(localNodeModules, 'react'),
  'react-dom': path.resolve(localNodeModules, 'react-dom'),
  'react-native': path.resolve(localNodeModules, 'react-native'),
  'react-native-web': path.resolve(localNodeModules, 'react-native-web'),
};

module.exports = config;
