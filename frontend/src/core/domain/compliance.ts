/** A compliance-balance snapshot for a single ship in a given year. */
export interface ComplianceBalance {
  readonly id: string;
  readonly shipId: string;
  readonly year: number;
  readonly cbGco2eq: number;
}
