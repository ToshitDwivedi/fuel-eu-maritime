import type { Route, RouteComparison, VesselType, FuelType } from '@core/domain';

/** Outbound port for route persistence. */
export interface IRouteRepository {
  /** Return every route, optionally filtered. */
  findAll(filters?: {
    vesselType?: VesselType;
    fuelType?: FuelType;
    year?: number;
  }): Promise<Route[]>;

  /** Find a single route by its database UUID. */
  findById(id: string): Promise<Route | null>;

  /** Return the current baseline route (at most one). */
  findBaseline(): Promise<Route | null>;

  /** Mark a route as the baseline (un-marks the previous one). */
  setBaseline(id: string): Promise<Route>;

  /**
   * Return all non-baseline routes compared against the current baseline.
   * Each entry includes percentDiff and a compliant flag.
   */
  findComparison(): Promise<RouteComparison[]>;
}
