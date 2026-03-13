import { Router } from 'express';
import type { IRouteRepository } from '@core/ports/outbound/route-repository.port';
import type { VesselType, FuelType } from '@core/domain';

const TARGET_INTENSITY = 89.3368;

export function createRoutesRouter(routeRepo: IRouteRepository): Router {
  const router = Router();

  // GET /routes?vesselType&fuelType&year
  router.get('/', async (req, res) => {
    try {
      const filters: {
        vesselType?: VesselType;
        fuelType?: FuelType;
        year?: number;
      } = {};

      if (req.query['vesselType']) {
        filters.vesselType = req.query['vesselType'] as VesselType;
      }
      if (req.query['fuelType']) {
        filters.fuelType = req.query['fuelType'] as FuelType;
      }
      if (req.query['year']) {
        filters.year = Number(req.query['year']);
      }

      const routes = await routeRepo.findAll(filters);
      res.json(routes);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /routes/:id/baseline
  router.post('/:id/baseline', async (req, res) => {
    try {
      const route = await routeRepo.setBaseline(req.params['id']!);
      res.json(route);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /routes/comparison
  router.get('/comparison', async (_req, res) => {
    try {
      const baseline = await routeRepo.findBaseline();

      if (!baseline) {
        res.status(404).json({ error: 'No baseline route set' });
        return;
      }

      const allRoutes = await routeRepo.findAll();
      const comparisons = allRoutes
        .filter((r) => !r.isBaseline)
        .map((route) => {
          const percentDiff =
            ((route.ghgIntensity / baseline.ghgIntensity) - 1) * 100;
          const compliant = route.ghgIntensity <= TARGET_INTENSITY;
          return {
            route,
            baselineGhgIntensity: baseline.ghgIntensity,
            percentDiff,
            compliant,
          };
        });

      res.json({ baseline, comparisons });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
