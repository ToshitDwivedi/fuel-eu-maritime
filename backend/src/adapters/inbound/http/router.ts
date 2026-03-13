import { Router } from 'express';
import type { IRouteRepository } from '@core/ports/outbound/route-repository.port';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import type { IPoolRepository } from '@core/ports/outbound/pool-repository.port';
import { createRoutesRouter } from './routesRouter';
import { createComplianceRouter } from './complianceRouter';
import { createBankingRouter } from './bankingRouter';
import { createPoolsRouter } from './poolsRouter';

export interface Repositories {
  routeRepo: IRouteRepository;
  complianceRepo: IComplianceRepository;
  bankRepo: IBankRepository;
  poolRepo: IPoolRepository;
}

/**
 * Create the top-level API router with all sub-routers wired to
 * the provided repository implementations (manual dependency injection).
 */
export function createApiRouter(repos: Repositories): Router {
  const router = Router();

  router.use('/routes', createRoutesRouter(repos.routeRepo));
  router.use(
    '/compliance',
    createComplianceRouter(repos.routeRepo, repos.complianceRepo, repos.bankRepo),
  );
  router.use('/banking', createBankingRouter(repos.complianceRepo, repos.bankRepo));
  router.use('/pools', createPoolsRouter(repos.poolRepo));

  return router;
}
