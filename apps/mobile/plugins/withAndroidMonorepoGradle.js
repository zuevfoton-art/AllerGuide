/**
 * Survive `expo prebuild --clean` for this pnpm monorepo.
 *
 * Expo's bare template sets `react.entryFile` via resolveAppEntry (correct) but
 * does not wire `bundleConfig` to apps/mobile/metro.config.js. Staging CI uses
 * `prebuild --clean`, so any hand-edits in android/app/build.gradle are wiped;
 * this plugin re-applies the metro config path after prebuild.
 *
 * Does NOT override `react.root` to the workspace root — Expo expects root to be
 * the app package.json directory (apps/mobile). Workspace packages resolve via
 * metro.config.js watchFolders / extraNodeModules.
 *
 * @param {import('expo/config').ExpoConfig} config
 * @returns {import('expo/config').ExpoConfig}
 */
function withAndroidMonorepoGradle(config) {
  // Lazy-require so web-only tooling that never loads config-plugins still works.
  const { withAppBuildGradle } = require('@expo/config-plugins');

  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Template ships a commented `// bundleConfig = …` example — only skip when
    // an active assignment is already present.
    if (/^\s*bundleConfig\s*=/m.test(contents)) {
      return cfg;
    }

    if (!contents.includes('bundleCommand = "export:embed"')) {
      return cfg;
    }

    contents = contents.replace(
      /bundleCommand = "export:embed"\n/,
      'bundleCommand = "export:embed"\n' +
        '    bundleConfig = file("${projectRoot}/metro.config.js")\n',
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withAndroidMonorepoGradle;
