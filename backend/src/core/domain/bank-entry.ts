/**
 * A banked surplus entry per Article 20 (Banking).
 * Ships with positive CB may bank the surplus for later use.
 */
export interface BankEntry {
  /** Database primary key (UUID). */
  readonly id: string;
  readonly shipId: string;
  readonly year: number;
  /** Banked amount in gCO₂eq (always positive when created). */
  readonly amountGco2eq: number;
  /** Whether this banked amount has been applied to offset a deficit. */
  readonly applied: boolean;
}
