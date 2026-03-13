import express from 'express';
import { createApiRouter } from '@adapters/inbound/http/router';
import type { Repositories } from '@adapters/inbound/http/router';

export type { Repositories };

/**
 * Create an Express app wired with the given repository implementations.
 * Keeps the app decoupled from concrete adapters (manual DI).
 */
export function createApp(repos: Repositories) {
  const app = express();

  // CORS for frontend dev server
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());
  app.use('/api', createApiRouter(repos));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
