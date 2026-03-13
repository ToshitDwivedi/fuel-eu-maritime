/** Vessel types supported by the platform. */
export type VesselType = 'Container' | 'BulkCarrier' | 'Tanker' | 'RoRo';

/** Marine fuel types. */
export type FuelType = 'HFO' | 'LNG' | 'MGO';

/** A single voyage route record. */
export interface Route {
  /** Database primary key (UUID). */
  readonly id: string;
  /** Business identifier (e.g. "R001"). */
  readonly routeId: string;
  readonly vesselType: VesselType;
  readonly fuelType: FuelType;
  readonly year: number;
  /** Well-to-wake GHG intensity in gCO₂e/MJ. */
  readonly ghgIntensity: number;
  /** Total fuel consumed in metric tonnes. */
  readonly fuelConsumption: number;
  /** Voyage distance in kilometres. */
  readonly distance: number;
  /** Total CO₂-equivalent emissions in metric tonnes. */
  readonly totalEmissions: number;
  /** Whether this route is the current comparison baseline. */
  readonly isBaseline: boolean;
}

/** Result of comparing a route against the baseline. */
export interface RouteComparison {
  readonly route: Route;
  readonly baselineGhgIntensity: number;
  /** ((comparison / baseline) − 1) × 100 */
  readonly percentDiff: number;
  /** True when ghgIntensity ≤ target (89.3368 gCO₂e/MJ). */
  readonly compliant: boolean;
}
