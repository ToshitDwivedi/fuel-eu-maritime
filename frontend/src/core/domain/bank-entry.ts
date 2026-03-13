/**
 * A banked surplus entry per Article 20 (Banking).
 */
export interface BankEntry {
  readonly id: string;
  readonly shipId: string;
  readonly year: number;
  readonly amountGco2eq: number;
  readonly applied: boolean;
}

/** Result returned after applying banked surplus. */
export interface BankResult {
  readonly cbBefore: number;
  readonly applied: number;
  readonly cbAfter: number;
}
