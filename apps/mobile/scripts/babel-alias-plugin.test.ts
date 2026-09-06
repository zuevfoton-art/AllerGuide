import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';
import { describe, expect, it } from 'vitest';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(mobileRoot, '../..');
const layoutFile = path.join(mobileRoot, 'app/_layout.tsx');
const dynamicImports = [
  "void import('@/src/services/alias-feedback-service');",
  "void import('@/src/services/profile-outbox-service');",
].join('\n');

function transformWith(configFile: string, source: string): string {
  const result = transformSync(source, {
    filename: layoutFile,
    configFile,
    babelrc: false,
  });
  if (!result?.code) throw new Error('Babel produced no code');
  return result.code;
}

describe('mobileAliasPlugin', () => {
  it.each([
    ['apps/mobile/babel.config.js', path.join(mobileRoot, 'babel.config.js')],
    ['workspace babel.config.js (Android Gradle metro root)', path.join(workspaceRoot, 'babel.config.js')],
  ])('rewrites dynamic import() aliases via %s', (_label, configFile) => {
    const code = transformWith(configFile, dynamicImports);
    expect(code).not.toMatch('@/src/');
    expect(code).toContain(`${mobileRoot}/src/services/alias-feedback-service`);
    expect(code).toContain(`${mobileRoot}/src/services/profile-outbox-service`);
  });

  it('still rewrites static import and require aliases', () => {
    const code = transformWith(
      path.join(mobileRoot, 'babel.config.js'),
      "export { default } from '@/src/db/init';\nrequire('@/src/services/analytics-service');\n",
    );
    expect(code).not.toMatch('@/src/');
    expect(code).toContain(`${mobileRoot}/src/db/init`);
    expect(code).toContain(`${mobileRoot}/src/services/analytics-service`);
  });
});
