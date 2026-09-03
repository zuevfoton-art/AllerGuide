/**
 * Numbers that live in both code and docs drift silently: the mobile SQLite
 * schema version and the newest Drizzle migration were both a release behind
 * when the codebase was re-indexed. Pure helpers so the RC gate can compare
 * them without reading the filesystem twice.
 */

/** `export const CURRENT_SCHEMA_VERSION = 10;` → 10 */
export function parseMobileSchemaVersion(migrationsSource) {
  const match = migrationsSource.match(/CURRENT_SCHEMA_VERSION\s*=\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

/** `['0000_a.sql', '0012_b.sql']` → 12 */
export function parseLatestMigrationNumber(migrationFileNames) {
  const numbers = migrationFileNames
    .map((name) => name.match(/^(\d+)_/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return numbers.length ? Math.max(...numbers) : null;
}

/**
 * @returns {string[]} human-readable failures; empty when docs match the code.
 */
export function findDocFactDrift({ schemaVersion, latestMigration, docs }) {
  const failures = [];

  for (const [docPath, text] of Object.entries(docs)) {
    const documentedVersions = [...text.matchAll(/CURRENT_SCHEMA_VERSION\D{0,3}(\d+)/g)].map(
      (match) => Number(match[1]),
    );
    if (documentedVersions.length === 0) {
      failures.push(`${docPath}: no CURRENT_SCHEMA_VERSION reference to check`);
    } else if (documentedVersions.some((version) => version !== schemaVersion)) {
      failures.push(
        `${docPath}: documents CURRENT_SCHEMA_VERSION ${documentedVersions.join('/')}, code has ${schemaVersion}`,
      );
    }

    const documentedMigrations = [...text.matchAll(/`?0000`?…`?(\d+)_/g)].map((match) =>
      Number(match[1]),
    );
    if (documentedMigrations.length === 0) {
      failures.push(`${docPath}: no drizzle migration range to check`);
    } else if (documentedMigrations.some((number) => number !== latestMigration)) {
      failures.push(
        `${docPath}: documents migrations up to ${documentedMigrations.join('/')}, newest is ${String(latestMigration).padStart(4, '0')}`,
      );
    }
  }

  return failures;
}
