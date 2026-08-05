/**
 * Survive `expo prebuild --clean`: keep MainActivity IME bottom padding that
 * restores adjustResize-like behavior on Android 15 / targetSdk 35+.
 *
 * @param {import('expo/config').ExpoConfig} config
 * @returns {import('expo/config').ExpoConfig}
 */
function withAndroidImeInsets(config) {
  const { withMainActivity } = require('@expo/config-plugins');

  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      return cfg;
    }

    let contents = cfg.modResults.contents;
    if (contents.includes('WindowInsetsCompat.Type.ime()')) {
      return cfg;
    }

    if (!contents.includes('import android.view.View')) {
      contents = contents.replace(
        /import android\.os\.Bundle\n/,
        'import android.os.Bundle\nimport android.view.View\n',
      );
    }

    if (!contents.includes('androidx.core.view.ViewCompat')) {
      contents = contents.replace(
        /import android\.view\.View\n/,
        'import android.view.View\n\nimport androidx.core.view.ViewCompat\nimport androidx.core.view.WindowInsetsCompat\n',
      );
    }

    const listenerBlock = `
    // Android 15 / targetSdk 35+: edge-to-edge enforcement breaks
    // windowSoftInputMode=adjustResize, so the IME covers TextInputs.
    // Re-apply IME bottom inset on the activity content root.
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
      view.setPadding(view.paddingLeft, view.paddingTop, view.paddingRight, imeBottom)
      insets
    }
`;

    if (contents.includes('super.onCreate(null)')) {
      contents = contents.replace(
        'super.onCreate(null)',
        `super.onCreate(null)\n${listenerBlock}`,
      );
    } else if (contents.includes('super.onCreate(savedInstanceState)')) {
      contents = contents.replace(
        'super.onCreate(savedInstanceState)',
        `super.onCreate(savedInstanceState)\n${listenerBlock}`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withAndroidImeInsets;
