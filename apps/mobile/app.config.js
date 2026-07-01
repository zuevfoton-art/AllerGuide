const base = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const plugins = [...base.expo.plugins];

  if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
    plugins.push([
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        url: process.env.SENTRY_URL || 'https://sentry.io/',
      },
    ]);
  }

  return {
    ...config,
    ...base,
    expo: {
      ...config?.expo,
      ...base.expo,
      plugins,
    },
  };
};
