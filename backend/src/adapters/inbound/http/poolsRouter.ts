import { Router } from 'express';
import type { IPoolRepository } from '@core/ports/outbound/pool-repository.port';
import { CreatePool } from '@core/application/CreatePool';

export function createPoolsRouter(poolRepo: IPoolRepository): Router {
  const router = Router();

  // POST /pools  body: { year, members: [{ shipId, cbBefore }] }
  router.post('/', async (req, res) => {
    try {
      const { year, members } = req.body as {
        year?: number;
        members?: Array<{ shipId: string; cbBefore: number }>;
      };

      if (year == null || !members || !Array.isArray(members)) {
        res.status(400).json({ error: 'year and members array are required' });
        return;
      }

      const useCase = new CreatePool(poolRepo);
      const result = await useCase.execute({ year, members });
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (
        message.includes('at least one member') ||
        message.includes('negative') ||
        message.includes('worse')
      ) {
        res.status(400).json({ error: message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}
