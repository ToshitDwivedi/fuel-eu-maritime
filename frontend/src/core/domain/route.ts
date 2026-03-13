/** Vessel types supported by the platform. */
export type VesselType = 'Container' | 'BulkCarrier' | 'Tanker' | 'RoRo';

/** Marine fuel types. */
export type FuelType = 'HFO' | 'LNG' | 'MGO';

/** A single voyage route record. */
export interface Route {
  readonly id: string;
  readonly routeId: string;
  readonly vesselType: VesselType;
  readonly fuelType: FuelType;
  readonly year: number;
  readonly ghgIntensity: number;
  readonly fuelConsumption: number;
  readonly distance: number;
  readonly totalEmissions: number;
  readonly isBaseline: boolean;
}

/** Result of comparing a route against the baseline. */
export interface RouteComparison {
  readonly route: Route;
  readonly baselineGhgIntensity: number;
  readonly percentDiff: number;
  readonly compliant: boolean;
}
