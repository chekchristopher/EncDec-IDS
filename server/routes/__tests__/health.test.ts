import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { createHealthRouter } from '../health.js';

describe('Health & Observability Routes', () => {
  it('mounts and returns 200 OK for /health/live', async () => {
    const router = createHealthRouter(() => 3);
    const app = express();
    app.use('/api', router);

    const req = { method: 'GET', url: '/health/live' } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    } as any;

    // Simulate route handler
    const liveHandler = (router.stack.find(s => s.route?.path === '/health/live')?.route?.stack[0] as any)?.handle;
    expect(liveHandler).toBeDefined();
    
    liveHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('provides structured memory and service telemetry on /health', () => {
    const router = createHealthRouter(() => 5);
    const healthHandler = (router.stack.find(s => s.route?.path === '/health')?.route?.stack[0] as any)?.handle;
    expect(healthHandler).toBeDefined();

    const req = {} as any;
    const res = {
      json: vi.fn()
    } as any;

    healthHandler(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'EncDec IDS Security Engine',
        version: '1.0.0',
        services: expect.objectContaining({
          websocket: { activeClients: 5 }
        })
      })
    );
  });
});
