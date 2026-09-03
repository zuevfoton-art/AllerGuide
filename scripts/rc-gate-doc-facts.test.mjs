import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findDocFactDrift,
  parseLatestMigrationNumber,
  parseMobileSchemaVersion,
} from './rc-gate-doc-facts.mjs';

describe('rc-gate doc facts', () => {
  it('reads the mobile schema version', () => {
    assert.equal(
      parseMobileSchemaVersion('export const CURRENT_SCHEMA_VERSION = 10;'),
      10,
    );
    assert.equal(parseMobileSchemaVersion('no version here'), null);
  });

  it('reads the newest migration number', () => {
    assert.equal(
      parseLatestMigrationNumber(['0000_a.sql', '0012_b.sql', '0009_c.sql', 'meta']),
      12,
    );
    assert.equal(parseLatestMigrationNumber([]), null);
  });

  it('passes when docs match the code', () => {
    const docs = {
      'doc.md': '- `CURRENT_SCHEMA_VERSION = 10`\n| `drizzle/0000`…`0012_*.sql` | migrations |',
    };
    assert.deepEqual(findDocFactDrift({ schemaVersion: 10, latestMigration: 12, docs }), []);
  });

  it('reports a stale schema version and migration range', () => {
    const docs = {
      'doc.md': '- `CURRENT_SCHEMA_VERSION = 9`\n| `drizzle/0000`…`0011_*.sql` | migrations |',
    };
    const failures = findDocFactDrift({ schemaVersion: 10, latestMigration: 12, docs });

    assert.equal(failures.length, 2);
    assert.match(failures[0], /documents CURRENT_SCHEMA_VERSION 9, code has 10/);
    assert.match(failures[1], /documents migrations up to 11, newest is 0012/);
  });

  it('reports docs that stopped mentioning the facts at all', () => {
    const failures = findDocFactDrift({
      schemaVersion: 10,
      latestMigration: 12,
      docs: { 'doc.md': 'no numbers' },
    });

    assert.deepEqual(failures, [
      'doc.md: no CURRENT_SCHEMA_VERSION reference to check',
      'doc.md: no drizzle migration range to check',
    ]);
  });
});
