import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { interpretStagingHealthResponse } from './rc-gate-health.mjs';

describe('interpretStagingHealthResponse', () => {
  it('accepts HTTP 200 JSON with ok:true', () => {
    const result = interpretStagingHealthResponse({
      status: 200,
      contentType: 'application/json',
      bodyText: '{"ok":true,"database":{"ok":true}}',
    });
    assert.deepEqual(result, { ok: true });
  });

  it('fails when body.ok is false and includes the database error', () => {
    const result = interpretStagingHealthResponse({
      status: 503,
      contentType: 'application/json',
      bodyText: '{"ok":false,"database":{"ok":false,"error":"write CONNECT_TIMEOUT db.example:6432"}}',
    });
    assert.equal(result.ok, false);
    assert.match(result.failure, /HTTP 503/);
    assert.match(result.failure, /body\.ok=false/);
    assert.match(result.failure, /CONNECT_TIMEOUT/);
  });

  it('fails with a snippet when Yandex API Gateway is stopped', () => {
    const result = interpretStagingHealthResponse({
      status: 403,
      contentType: 'text/plain',
      bodyText: 'API Gateway d5dpk0j33erp3deho9iq is stopped and cannot be used',
    });
    assert.equal(result.ok, false);
    assert.match(result.failure, /API Gateway is stopped/);
    assert.match(result.failure, /HTTP 403/);
    assert.match(result.failure, /cannot be used/);
  });

  it('fails with HTTP status when the body is not JSON', () => {
    const result = interpretStagingHealthResponse({
      status: 502,
      contentType: 'text/html',
      bodyText: '<html>API Gateway error</html>',
    });
    assert.equal(result.ok, false);
    assert.match(result.failure, /non-JSON/);
    assert.match(result.failure, /HTTP 502/);
    assert.match(result.failure, /API Gateway error/);
  });
});
