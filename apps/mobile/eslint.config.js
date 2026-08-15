const expoConfig = require('eslint-config-expo/flat');
const reactNativeA11y = require('eslint-plugin-react-native-a11y');

module.exports = [
  ...expoConfig,
  {
    ignores: ['ios/**', 'android/**', 'node_modules/**', '.expo/**', 'babel.config.js'],
  },
  {
    plugins: {
      'react-native-a11y': reactNativeA11y,
    },
    rules: {
      // Labels on Touchable* only (plugin does not cover Pressable). Warn so lint stays green.
      'react-native-a11y/has-accessibility-props': 'warn',
    },
  },
];
