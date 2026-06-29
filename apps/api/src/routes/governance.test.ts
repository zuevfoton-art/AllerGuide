import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerGovernanceRoutes } from './governance';

describe('governance routes (E.1–E.5)', () => {
  it('returns advisory board, evidence registry, and disclaimer metadata', async () => {
    const app = express();
    registerGovernanceRoutes(app);

    const response = await request(app).get('/api/governance');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.advisoryBoard.members.length).toBeGreaterThan(0);
    expect(response.body.evidenceRegistry.entryCount).toBeGreaterThanOrEqual(10);
    expect(response.body.disclaimer.version).toBe('mdr-v2');
    expect(response.body.goldenScenarios.coreCount).toBeGreaterThanOrEqual(18);
  });
});
