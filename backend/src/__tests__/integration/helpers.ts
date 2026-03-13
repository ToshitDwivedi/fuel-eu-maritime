import type { Route, VesselType, FuelType, RouteComparison } from '@core/domain';
import type { ComplianceBalance } from '@core/domain';
import type { BankEntry } from '@core/domain';
import type { Pool, PoolMember } from '@core/domain';
import type { IRouteRepository } from '@core/ports/outbound/route-repository.port';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import type { IPoolRepository } from '@core/ports/outbound/pool-repository.port';
import { randomUUID } from 'crypto';

// ── Seed data ──────────────────────────────────────────────

export const SEED_ROUTES: Route[] = [
  { id: 'uuid-r001', routeId: 'R001', vesselType: 'Container', fuelType: 'HFO', year: 2024, ghgIntensity: 91.0, fuelConsumption: 5000, distance: 12000, totalEmissions: 4500, isBaseline: false },
  { id: 'uuid-r002', routeId: 'R002', vesselType: 'BulkCarrier', fuelType: 'LNG', year: 2024, ghgIntensity: 88.0, fuelConsumption: 4800, distance: 11500, totalEmissions: 4200, isBaseline: false },
  { id: 'uuid-r003', routeId: 'R003', vesselType: 'Tanker', fuelType: 'MGO', year: 2024, ghgIntensity: 93.5, fuelConsumption: 5100, distance: 12500, totalEmissions: 4700, isBaseline: false },
  { id: 'uuid-r004', routeId: 'R004', vesselType: 'RoRo', fuelType: 'HFO', year: 2025, ghgIntensity: 89.2, fuelConsumption: 4900, distance: 11800, totalEmissions: 4300, isBaseline: false },
  { id: 'uuid-r005', routeId: 'R005', vesselType: 'Container', fuelType: 'LNG', year: 2025, ghgIntensity: 90.5, fuelConsumption: 4950, distance: 11900, totalEmissions: 4400, isBaseline: false },
];

// ── In-memory IRouteRepository ─────────────────────────────

export class InMemoryRouteRepo implements IRouteRepository {
  private routes: Route[];

  constructor(seed: Route[] = SEED_ROUTES) {
    this.routes = seed.map((r) => ({ ...r }));
  }

  async findAll(filters?: { vesselType?: VesselType; fuelType?: FuelType; year?: number }): Promise<Route[]> {
    let result = [...this.routes];
    if (filters?.vesselType) result = result.filter((r) => r.vesselType === filters.vesselType);
    if (filters?.fuelType) result = result.filter((r) => r.fuelType === filters.fuelType);
    if (filters?.year) result = result.filter((r) => r.year === filters.year);
    return result;
  }

  async findById(id: string): Promise<Route | null> {
    return this.routes.find((r) => r.id === id || r.routeId === id) ?? null;
  }

  async findBaseline(): Promise<Route | null> {
    return this.routes.find((r) => r.isBaseline) ?? null;
  }

  async setBaseline(id: string): Promise<Route> {
    const target = this.routes.find((r) => r.id === id || r.routeId === id);
    if (!target) throw new Error(`Route not found: ${id}`);
    this.routes = this.routes.map((r) => ({ ...r, isBaseline: (r.id === target.id) }));
    return { ...target, isBaseline: true };
  }

  async findComparison(): Promise<RouteComparison[]> {
    return [];
  }
}

// ── In-memory IComplianceRepository ────────────────────────

export class InMemoryComplianceRepo implements IComplianceRepository {
  private records: ComplianceBalance[] = [];

  async saveCB(cb: Omit<ComplianceBalance, 'id'>): Promise<ComplianceBalance> {
    // Upsert: replace existing record for same ship+year
    this.records = this.records.filter(
      (r) => !(r.shipId === cb.shipId && r.year === cb.year),
    );
    const saved: ComplianceBalance = { id: randomUUID(), ...cb };
    this.records.push(saved);
    return saved;
  }

  async findCB(shipId: string, year: number): Promise<ComplianceBalance | null> {
    return this.records.find((r) => r.shipId === shipId && r.year === year) ?? null;
  }
}

// ── In-memory IBankRepository ──────────────────────────────

export class InMemoryBankRepo implements IBankRepository {
  private entries: BankEntry[] = [];

  async save(entry: Omit<BankEntry, 'id'>): Promise<BankEntry> {
    const saved: BankEntry = { id: randomUUID(), ...entry };
    this.entries.push(saved);
    return saved;
  }

  async findByShip(shipId: string, year: number): Promise<BankEntry[]> {
    return this.entries.filter((e) => e.shipId === shipId && e.year === year);
  }

  async findAvailable(shipId: string): Promise<BankEntry[]> {
    return this.entries.filter((e) => e.shipId === shipId && !e.applied);
  }

  async markApplied(id: string): Promise<BankEntry> {
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Bank entry not found: ${id}`);
    const updated: BankEntry = { ...this.entries[idx]!, applied: true };
    this.entries[idx] = updated;
    return updated;
  }
}

// ── In-memory IPoolRepository ──────────────────────────────

export class InMemoryPoolRepo implements IPoolRepository {
  private pools: Pool[] = [];

  async createPool(year: number): Promise<Pool> {
    const pool: Pool = { id: randomUUID(), year, members: [] };
    this.pools.push(pool);
    return pool;
  }

  async addMembers(poolId: string, members: readonly PoolMember[]): Promise<Pool> {
    const idx = this.pools.findIndex((p) => p.id === poolId);
    if (idx === -1) throw new Error(`Pool not found: ${poolId}`);
    const updated: Pool = { ...this.pools[idx]!, members };
    this.pools[idx] = updated;
    return updated;
  }
}
