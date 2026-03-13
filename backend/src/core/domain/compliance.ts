/** A compliance-balance snapshot for a single ship in a given year. */
export interface ComplianceBalance {
  /** Database primary key (UUID). */
  readonly id: string;
  readonly shipId: string;
  readonly year: number;
  /**
   * Compliance balance in gCO₂eq.
   * Positive → surplus, negative → deficit.
   * Formula: (target − actual) × energyInScope
   */
  readonly cbGco2eq: number;
}
