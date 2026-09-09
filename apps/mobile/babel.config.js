const path = require('path');

function mobileAliasPlugin() {
  return {
    visitor: {
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(nodePath) {
        rewriteSource(nodePath.node.source);
      },
      CallExpression(nodePath) {
        const callee = nodePath.node.callee;
        const args = nodePath.node.arguments;
        // `import()` is a CallExpression whose callee is Import — not `require`.
        // Release Metro (EAS / Gradle export:embed) does not run metro.config
        // resolveRequest on those specifiers, so `@/` must be rewritten here.
        const isRequire = callee.type === 'Identifier' && callee.name === 'require';
        const isDynamicImport = callee.type === 'Import';
        if (isRequire || isDynamicImport) {
          rewriteSource(args[0]);
        }
      },
    },
  };
}

function rewriteSource(source) {
  if (!source || source.type !== 'StringLiteral' || !source.value.startsWith('@/')) {
    return;
  }
  source.value = path.resolve(__dirname, source.value.slice(2)).replace(/\\/g, '/');
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [mobileAliasPlugin],
  };
};
