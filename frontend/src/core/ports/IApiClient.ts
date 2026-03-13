import type {
  Route,
  RouteComparison,
  ComplianceBalance,
  BankResult,
  PoolMemberInput,
  PoolResult,
  VesselType,
  FuelType,
} from '@core/domain';

/** Filters for the routes list. */
export interface RouteFilters {
  readonly vesselType?: VesselType;
  readonly fuelType?: FuelType;
  readonly year?: number;
}

/**
 * Outbound port — contract for the API client.
 * Infrastructure adapters implement this interface.
 */
export interface IApiClient {
  getRoutes(filters?: RouteFilters): Promise<Route[]>;
  setBaseline(routeId: string): Promise<void>;
  getComparison(): Promise<RouteComparison[]>;
  getCB(shipId: string, year: number): Promise<ComplianceBalance>;
  getAdjustedCB(shipId: string, year: number): Promise<ComplianceBalance>;
  bankSurplus(shipId: string, year: number, amount: number): Promise<void>;
  applyBanked(shipId: string, year: number, amount: number): Promise<BankResult>;
  createPool(year: number, members: PoolMemberInput[]): Promise<PoolResult>;
}
