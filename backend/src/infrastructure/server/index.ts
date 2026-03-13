import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import type { Repositories } from './app';
import type { Route, VesselType, FuelType, RouteComparison, ComplianceBalance, BankEntry, Pool, PoolMember } from '@core/domain';
import { randomUUID } from 'crypto';

// ── Seed data (same as in seed.ts) ──────────────────────────

const SEED_ROUTES: Route[] = [
  { id: randomUUID(), routeId: 'R001', vesselType: 'Container',   fuelType: 'HFO', year: 2024, ghgIntensity: 91.0, fuelConsumption: 5000, distance: 12000, totalEmissions: 4500, isBaseline: false },
  { id: randomUUID(), routeId: 'R002', vesselType: 'BulkCarrier', fuelType: 'LNG', year: 2024, ghgIntensity: 88.0, fuelConsumption: 4800, distance: 11500, totalEmissions: 4200, isBaseline: true  },
  { id: randomUUID(), routeId: 'R003', vesselType: 'Tanker',      fuelType: 'MGO', year: 2024, ghgIntensity: 93.5, fuelConsumption: 5100, distance: 12500, totalEmissions: 4700, isBaseline: false },
  { id: randomUUID(), routeId: 'R004', vesselType: 'RoRo',        fuelType: 'HFO', year: 2025, ghgIntensity: 89.2, fuelConsumption: 4900, distance: 11800, totalEmissions: 4300, isBaseline: false },
  { id: randomUUID(), routeId: 'R005', vesselType: 'Container',   fuelType: 'LNG', year: 2025, ghgIntensity: 90.5, fuelConsumption: 4950, distance: 11900, totalEmissions: 4400, isBaseline: false },
];

// ── In-memory repositories ──────────────────────────────────

let routes = SEED_ROUTES.map((r) => ({ ...r }));
const complianceRecords: ComplianceBalance[] = [];
const bankEntries: BankEntry[] = [];
const pools: Pool[] = [];

const repos: Repositories = {
  routeRepo: {
    async findAll(filters?: { vesselType?: VesselType; fuelType?: FuelType; year?: number }) {
      let result = [...routes];
      if (filters?.vesselType) result = result.filter((r) => r.vesselType === filters.vesselType);
      if (filters?.fuelType) result = result.filter((r) => r.fuelType === filters.fuelType);
      if (filters?.year) result = result.filter((r) => r.year === filters.year);
      return result;
    },
    async findById(id: string) {
      return routes.find((r) => r.id === id || r.routeId === id) ?? null;
    },
    async findBaseline() {
      return routes.find((r) => r.isBaseline) ?? null;
    },
    async setBaseline(id: string) {
      const target = routes.find((r) => r.id === id || r.routeId === id);
      if (!target) throw new Error(`Route not found: ${id}`);
      routes = routes.map((r) => ({ ...r, isBaseline: r.id === target.id }));
      return { ...target, isBaseline: true };
    },
    async findComparison(): Promise<RouteComparison[]> {
      return [];
    },
  },
  complianceRepo: {
    async saveCB(cb: Omit<ComplianceBalance, 'id'>) {
      const idx = complianceRecords.findIndex((r) => r.shipId === cb.shipId && r.year === cb.year);
      if (idx !== -1) complianceRecords.splice(idx, 1);
      const saved: ComplianceBalance = { id: randomUUID(), ...cb };
      complianceRecords.push(saved);
      return saved;
    },
    async findCB(shipId: string, year: number) {
      return complianceRecords.find((r) => r.shipId === shipId && r.year === year) ?? null;
    },
  },
  bankRepo: {
    async save(entry: Omit<BankEntry, 'id'>) {
      const saved: BankEntry = { id: randomUUID(), ...entry };
      bankEntries.push(saved);
      return saved;
    },
    async findByShip(shipId: string, year: number) {
      return bankEntries.filter((e) => e.shipId === shipId && e.year === year);
    },
    async findAvailable(shipId: string) {
      return bankEntries.filter((e) => e.shipId === shipId && !e.applied);
    },
    async markApplied(id: string) {
      const idx = bankEntries.findIndex((e) => e.id === id);
      if (idx === -1) throw new Error(`Bank entry not found: ${id}`);
      const updated: BankEntry = { ...bankEntries[idx]!, applied: true };
      bankEntries[idx] = updated;
      return updated;
    },
  },
  poolRepo: {
    async createPool(year: number) {
      const pool: Pool = { id: randomUUID(), year, members: [] };
      pools.push(pool);
      return pool;
    },
    async addMembers(poolId: string, members: readonly PoolMember[]) {
      const idx = pools.findIndex((p) => p.id === poolId);
      if (idx === -1) throw new Error(`Pool not found: ${poolId}`);
      const updated: Pool = { ...pools[idx]!, members };
      pools[idx] = updated;
      return updated;
    },
  },
};

const PORT = Number(process.env['PORT']) || 3000;
const app = createApp(repos);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
