import { Router } from 'express';
import type { IRouteRepository } from '@core/ports/outbound/route-repository.port';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import { ComputeCB } from '@core/application/ComputeCB';

export function createComplianceRouter(
  routeRepo: IRouteRepository,
  complianceRepo: IComplianceRepository,
  bankRepo: IBankRepository,
): Router {
  const router = Router();

  // GET /compliance/cb?shipId&year
  router.get('/cb', async (req, res) => {
    try {
      const shipId = req.query['shipId'] as string | undefined;
      const year = req.query['year'] ? Number(req.query['year']) : undefined;

      if (!shipId || !year) {
        res.status(400).json({ error: 'shipId and year are required' });
        return;
      }

      const useCase = new ComputeCB(routeRepo, complianceRepo);
      const result = await useCase.execute(shipId, year);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /compliance/adjusted-cb?shipId&year
  router.get('/adjusted-cb', async (req, res) => {
    try {
      const shipId = req.query['shipId'] as string | undefined;
      const year = req.query['year'] ? Number(req.query['year']) : undefined;

      if (!shipId || !year) {
        res.status(400).json({ error: 'shipId and year are required' });
        return;
      }

      const cb = await complianceRepo.findCB(shipId, year);

      if (!cb) {
        res.status(404).json({
          error: `No compliance balance found for ship ${shipId} in ${year}`,
        });
        return;
      }

      // Sum up all applied bank entry amounts for this ship
      const bankEntries = await bankRepo.findByShip(shipId, year);
      const appliedAmount = bankEntries
        .filter((e) => e.applied)
        .reduce((sum, e) => sum + e.amountGco2eq, 0);

      res.json({
        shipId: cb.shipId,
        year: cb.year,
        cbGco2eq: cb.cbGco2eq,
        appliedBanked: appliedAmount,
        adjustedCb: cb.cbGco2eq + appliedAmount,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
