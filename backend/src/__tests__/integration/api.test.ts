import request from 'supertest';
import { createApp } from '@infrastructure/server/app';
import {
  InMemoryRouteRepo,
  InMemoryComplianceRepo,
  InMemoryBankRepo,
  InMemoryPoolRepo,
  SEED_ROUTES,
} from './helpers';
import type { Express } from 'express';

const TARGET_INTENSITY = 89.3368;
const MJ_PER_TONNE = 41_000;

let app: Express;
let routeRepo: InMemoryRouteRepo;
let complianceRepo: InMemoryComplianceRepo;
let bankRepo: InMemoryBankRepo;
let poolRepo: InMemoryPoolRepo;

beforeEach(() => {
  routeRepo = new InMemoryRouteRepo();
  complianceRepo = new InMemoryComplianceRepo();
  bankRepo = new InMemoryBankRepo();
  poolRepo = new InMemoryPoolRepo();
  app = createApp({ routeRepo, complianceRepo, bankRepo, poolRepo });
});

// ═══════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════

describe('GET /api/routes', () => {
  it('should return all 5 seeded routes', async () => {
    const res = await request(app).get('/api/routes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);

    const routeIds = res.body.map((r: { routeId: string }) => r.routeId);
    expect(routeIds).toEqual(
      expect.arrayContaining(['R001', 'R002', 'R003', 'R004', 'R005']),
    );
  });

  it('should filter by vesselType', async () => {
    const res = await request(app).get('/api/routes?vesselType=Container');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    for (const r of res.body) {
      expect(r.vesselType).toBe('Container');
    }
  });

  it('should filter by year', async () => {
    const res = await request(app).get('/api/routes?year=2025');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    for (const r of res.body) {
      expect(r.year).toBe(2025);
    }
  });
});

describe('POST /api/routes/:id/baseline', () => {
  it('should set R001 as baseline and unset others', async () => {
    const res = await request(app).post('/api/routes/R001/baseline');

    expect(res.status).toBe(200);
    expect(res.body.routeId).toBe('R001');
    expect(res.body.isBaseline).toBe(true);

    // Verify others are not baseline
    const all = await request(app).get('/api/routes');
    const baselines = all.body.filter((r: { isBaseline: boolean }) => r.isBaseline);
    expect(baselines).toHaveLength(1);
    expect(baselines[0].routeId).toBe('R001');
  });

  it('should return 404 for unknown route', async () => {
    const res = await request(app).post('/api/routes/UNKNOWN/baseline');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found');
  });
});

describe('GET /api/routes/comparison', () => {
  it('should return 404 when no baseline is set', async () => {
    const res = await request(app).get('/api/routes/comparison');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('No baseline');
  });

  it('should return percentDiff and compliant flags after baseline is set', async () => {
    // Set R001 (ghgIntensity=91.0) as baseline
    await request(app).post('/api/routes/R001/baseline');

    const res = await request(app).get('/api/routes/comparison');

    expect(res.status).toBe(200);
    expect(res.body.baseline.routeId).toBe('R001');
    expect(res.body.comparisons).toHaveLength(4); // all except baseline

    for (const c of res.body.comparisons) {
      // percentDiff = ((other.ghgIntensity / baseline.ghgIntensity) - 1) * 100
      const expected = ((c.route.ghgIntensity / 91.0) - 1) * 100;
      expect(c.percentDiff).toBeCloseTo(expected, 4);
      expect(c.compliant).toBe(c.route.ghgIntensity <= TARGET_INTENSITY);
      expect(c.baselineGhgIntensity).toBe(91.0);
    }

    // R002 (88.0) should be compliant
    const r002 = res.body.comparisons.find(
      (c: { route: { routeId: string } }) => c.route.routeId === 'R002',
    );
    expect(r002.compliant).toBe(true);

    // R003 (93.5) should not be compliant
    const r003 = res.body.comparisons.find(
      (c: { route: { routeId: string } }) => c.route.routeId === 'R003',
    );
    expect(r003.compliant).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// Compliance
// ═══════════════════════════════════════════════════════════

describe('GET /api/compliance/cb', () => {
  it('should return 400 when shipId or year is missing', async () => {
    const res = await request(app).get('/api/compliance/cb');
    expect(res.status).toBe(400);
  });

  it('should return negative CB for deficit route R003', async () => {
    const res = await request(app).get('/api/compliance/cb?shipId=R003&year=2024');

    expect(res.status).toBe(200);
    expect(res.body.shipId).toBe('R003');
    expect(res.body.year).toBe(2024);
    expect(res.body.surplus).toBe(false);

    // (89.3368 - 93.5) * (5100 * 41000) = -4.1632 * 209,100,000
    const expectedCB = (TARGET_INTENSITY - 93.5) * (5100 * MJ_PER_TONNE);
    expect(res.body.cbGco2eq).toBeCloseTo(expectedCB, 0);
    expect(res.body.cbGco2eq).toBeLessThan(0);
  });

  it('should return positive CB for surplus route R002', async () => {
    const res = await request(app).get('/api/compliance/cb?shipId=R002&year=2024');

    expect(res.status).toBe(200);
    expect(res.body.shipId).toBe('R002');
    expect(res.body.surplus).toBe(true);

    // (89.3368 - 88.0) * (4800 * 41000) = 1.3368 * 196,800,000
    const expectedCB = (TARGET_INTENSITY - 88.0) * (4800 * MJ_PER_TONNE);
    expect(res.body.cbGco2eq).toBeCloseTo(expectedCB, 0);
    expect(res.body.cbGco2eq).toBeGreaterThan(0);
  });

  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/api/compliance/cb?shipId=UNKNOWN&year=2024');
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════
// Banking
// ═══════════════════════════════════════════════════════════

describe('POST /api/banking/bank', () => {
  it('should bank surplus with 201', async () => {
    // First compute CB for surplus route R002
    await request(app).get('/api/compliance/cb?shipId=R002&year=2024');

    const cbRes = await request(app).get('/api/compliance/cb?shipId=R002&year=2024');
    const surplusCB = cbRes.body.cbGco2eq;

    const res = await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 100_000_000 });

    expect(res.status).toBe(201);
    expect(res.body.shipId).toBe('R002');
    expect(res.body.amountGco2eq).toBe(100_000_000);
    expect(res.body.applied).toBe(false);
    expect(surplusCB).toBeGreaterThan(100_000_000); // sanity check
  });

  it('should return 400 when amount > CB', async () => {
    // Compute CB for R002 (surplus ~263M)
    await request(app).get('/api/compliance/cb?shipId=R002&year=2024');

    const res = await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 999_999_999_999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient surplus');
  });

  it('should return 400 when amount is zero', async () => {
    const res = await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('must be positive');
  });

  it('should return 404 when no CB exists for ship', async () => {
    const res = await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 100 });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('No compliance balance found');
  });
});

describe('POST /api/banking/apply', () => {
  it('should apply banked surplus and return cb_after', async () => {
    // 1. Compute CB for deficit route R003
    const cbRes = await request(app).get('/api/compliance/cb?shipId=R003&year=2024');
    const deficitCB = cbRes.body.cbGco2eq; // negative

    // 2. Compute CB for surplus route R002, then bank some
    await request(app).get('/api/compliance/cb?shipId=R002&year=2024');
    // Manually seed a bank entry for R003 (as if R003 had banked from a previous year)
    // Instead, let's bank from R002 surplus for testing:
    // Actually, banking is per-ship. Let's bank R002's surplus, then apply to R002 itself
    // to keep it simple conceptually:

    // Or: compute R002 CB, bank some, compute R003 CB (deficit), apply R003's banked
    // But BankSurplus checks CB >= amount for the *same* ship.
    // Let me approach differently: bank from R002, then apply from R002
    await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 50_000_000 });

    // Now apply some of R002's banked amount
    const applyRes = await request(app)
      .post('/api/banking/apply')
      .send({ shipId: 'R002', year: 2024, amount: 30_000_000 });

    expect(applyRes.status).toBe(200);
    expect(applyRes.body.applied).toBe(30_000_000);
    expect(applyRes.body.remaining).toBe(20_000_000); // 50M - 30M
    // cbAfter = original CB + 30M applied
    const expectedCB = (TARGET_INTENSITY - 88.0) * (4800 * MJ_PER_TONNE);
    expect(applyRes.body.cbAfter).toBeCloseTo(expectedCB + 30_000_000, 0);
  });

  it('should return 400 when applying more than available', async () => {
    // Compute and bank
    await request(app).get('/api/compliance/cb?shipId=R002&year=2024');
    await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 50_000_000 });

    const res = await request(app)
      .post('/api/banking/apply')
      .send({ shipId: 'R002', year: 2024, amount: 100_000_000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient banked surplus');
  });
});

describe('GET /api/banking/records', () => {
  it('should return bank entries for a ship', async () => {
    // Compute CB and bank
    await request(app).get('/api/compliance/cb?shipId=R002&year=2024');
    await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 50_000_000 });

    const res = await request(app).get('/api/banking/records?shipId=R002&year=2024');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].amountGco2eq).toBe(50_000_000);
    expect(res.body[0].applied).toBe(false);
  });

  it('should return 400 when params are missing', async () => {
    const res = await request(app).get('/api/banking/records');
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════
// Compliance — adjusted CB
// ═══════════════════════════════════════════════════════════

describe('GET /api/compliance/adjusted-cb', () => {
  it('should return adjusted CB after banking apply', async () => {
    // Compute CB, bank, apply
    await request(app).get('/api/compliance/cb?shipId=R002&year=2024');
    await request(app)
      .post('/api/banking/bank')
      .send({ shipId: 'R002', year: 2024, amount: 50_000_000 });
    await request(app)
      .post('/api/banking/apply')
      .send({ shipId: 'R002', year: 2024, amount: 30_000_000 });

    const res = await request(app).get(
      '/api/compliance/adjusted-cb?shipId=R002&year=2024',
    );

    expect(res.status).toBe(200);
    expect(res.body.shipId).toBe('R002');
    // The full 50M bank entry was marked as applied (entry-level, not partial)
    expect(res.body.appliedBanked).toBe(50_000_000);

    const rawCB = (TARGET_INTENSITY - 88.0) * (4800 * MJ_PER_TONNE);
    expect(res.body.cbGco2eq).toBeCloseTo(rawCB, 0);
    expect(res.body.adjustedCb).toBeCloseTo(rawCB + 50_000_000, 0);
  });

  it('should return 404 when no CB exists', async () => {
    const res = await request(app).get(
      '/api/compliance/adjusted-cb?shipId=R002&year=2024',
    );
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════
// Pools
// ═══════════════════════════════════════════════════════════

describe('POST /api/pools', () => {
  it('should create a valid pool with 201', async () => {
    const res = await request(app)
      .post('/api/pools')
      .send({
        year: 2024,
        members: [
          { shipId: 'S1', cbBefore: 500_000 },
          { shipId: 'S2', cbBefore: -300_000 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.poolId).toBeDefined();
    expect(res.body.year).toBe(2024);
    expect(res.body.members).toHaveLength(2);

    const s1 = res.body.members.find((m: { shipId: string }) => m.shipId === 'S1');
    expect(s1.cbAfter).toBe(0); // donated surplus

    const s2 = res.body.members.find((m: { shipId: string }) => m.shipId === 'S2');
    expect(s2.cbAfter).toBe(0); // deficit fully covered
  });

  it('should return 400 when sum < 0', async () => {
    const res = await request(app)
      .post('/api/pools')
      .send({
        year: 2024,
        members: [
          { shipId: 'S1', cbBefore: 100_000 },
          { shipId: 'S2', cbBefore: -200_000 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('negative');
  });

  it('should return 400 when members array is missing', async () => {
    const res = await request(app)
      .post('/api/pools')
      .send({ year: 2024 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('should handle multi-ship pool with partial deficit coverage', async () => {
    // total = 100K + 200K - 250K = 50K >= 0
    const res = await request(app)
      .post('/api/pools')
      .send({
        year: 2024,
        members: [
          { shipId: 'S1', cbBefore: 100_000 },
          { shipId: 'S2', cbBefore: 200_000 },
          { shipId: 'S3', cbBefore: -250_000 },
        ],
      });

    expect(res.status).toBe(201);

    const s3 = res.body.members.find((m: { shipId: string }) => m.shipId === 'S3');
    expect(s3.cbAfter).toBe(0); // fully covered (300K surplus > 250K deficit)
  });
});
