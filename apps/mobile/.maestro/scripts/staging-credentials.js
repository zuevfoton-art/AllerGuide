/* Maestro runScript — unique staging email + password (matches staging-*-smoke scripts) */
/* eslint-disable no-undef */
output.email = `maestro-${Date.now()}@staging.test`;
output.password = 'SmokeTest1!';
