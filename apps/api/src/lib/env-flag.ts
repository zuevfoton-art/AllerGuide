/**
 * Unset / empty = on. Explicit `false` or `off` disables.
 * Places and Air Quality stay available whenever their keys are present.
 */
export function isDefaultOnEnvFlag(value: string | undefined): boolean {
  return value !== 'false' && value !== 'off';
}
