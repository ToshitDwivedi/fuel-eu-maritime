import { Router } from 'express';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import { BankSurplus } from '@core/application/BankSurplus';
import { ApplyBanked } from '@core/application/ApplyBanked';

export function createBankingRouter(
  complianceRepo: IComplianceRepository,
  bankRepo: IBankRepository,
): Router {
  const router = Router();

  // GET /banking/records?shipId&year
  router.get('/records', async (req, res) => {
    try {
      const shipId = req.query['shipId'] as string | undefined;
      const year = req.query['year'] ? Number(req.query['year']) : undefined;

      if (!shipId || !year) {
        res.status(400).json({ error: 'shipId and year are required' });
        return;
      }

      const entries = await bankRepo.findByShip(shipId, year);
      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /banking/bank  body: { shipId, year, amount }
  router.post('/bank', async (req, res) => {
    try {
      const { shipId, year, amount } = req.body as {
        shipId?: string;
        year?: number;
        amount?: number;
      };

      if (!shipId || year == null || amount == null) {
        res.status(400).json({ error: 'shipId, year, and amount are required' });
        return;
      }

      const useCase = new BankSurplus(complianceRepo, bankRepo);
      const result = await useCase.execute({ shipId, year, amount });
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (
        message.includes('not found') ||
        message.includes('No compliance balance')
      ) {
        res.status(404).json({ error: message });
      } else if (
        message.includes('must be positive') ||
        message.includes('Insufficient')
      ) {
        res.status(400).json({ error: message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // POST /banking/apply  body: { shipId, year, amount }
  router.post('/apply', async (req, res) => {
    try {
      const { shipId, year, amount } = req.body as {
        shipId?: string;
        year?: number;
        amount?: number;
      };

      if (!shipId || year == null || amount == null) {
        res.status(400).json({ error: 'shipId, year, and amount are required' });
        return;
      }

      const useCase = new ApplyBanked(bankRepo, complianceRepo);
      const result = await useCase.execute({ shipId, year, amount });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (
        message.includes('not found') ||
        message.includes('No compliance balance')
      ) {
        res.status(404).json({ error: message });
      } else if (
        message.includes('must be positive') ||
        message.includes('Insufficient')
      ) {
        res.status(400).json({ error: message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}
