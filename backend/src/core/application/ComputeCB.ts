import type { IRouteRepository } from '@core/ports/outbound/route-repository.port';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';

/** FuelEU 2025 target: 2 % below reference value 91.16 gCO₂e/MJ. */
const TARGET_INTENSITY = 89.3368;

/** HFO lower calorific value approximation. */
const MJ_PER_TONNE = 41_000;

export interface ComputeCBResult {
  readonly shipId: string;
  readonly year: number;
  readonly cbGco2eq: number;
  readonly surplus: boolean;
}

/**
 * Use-case: compute the Compliance Balance for a given route.
 *
 * Formula:
 *   energyInScope (MJ) = fuelConsumption × 41 000
 *   CB (gCO₂eq)        = (TARGET_INTENSITY − ghgIntensity) × energyInScope
 *
 * Positive CB → surplus, negative → deficit.
 */
export class ComputeCB {
  constructor(
    private readonly routeRepo: IRouteRepository,
    private readonly complianceRepo: IComplianceRepository,
  ) {}

  async execute(routeId: string, year: number): Promise<ComputeCBResult> {
    const route = await this.routeRepo.findById(routeId);

    if (!route) {
      throw new Error(`Route not found: ${routeId}`);
    }

    const energyInScope = route.fuelConsumption * MJ_PER_TONNE;
    const cbGco2eq = (TARGET_INTENSITY - route.ghgIntensity) * energyInScope;

    const saved = await this.complianceRepo.saveCB({
      shipId: route.routeId,
      year,
      cbGco2eq,
    });

    return {
      shipId: saved.shipId,
      year: saved.year,
      cbGco2eq: saved.cbGco2eq,
      surplus: saved.cbGco2eq >= 0,
    };
  }
}
