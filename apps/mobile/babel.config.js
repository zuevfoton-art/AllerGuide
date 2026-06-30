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
        if (callee.type === 'Identifier' && callee.name === 'require') {
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
