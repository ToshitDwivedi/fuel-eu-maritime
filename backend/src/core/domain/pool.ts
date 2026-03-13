/**
 * A single member within a compliance pool.
 * Tracks CB before and after the pooling allocation.
 */
export interface PoolMember {
  readonly shipId: string;
  /** CB before pooling redistribution (gCO₂eq). */
  readonly cbBefore: number;
  /** CB after pooling redistribution (gCO₂eq). */
  readonly cbAfter: number;
}

/**
 * A compliance pool per Article 21 (Pooling).
 * Groups ships so surplus offsets deficit, subject to:
 *   - ∑ adjustedCB ≥ 0
 *   - Deficit ship cannot exit worse
 *   - Surplus ship cannot exit negative
 */
export interface Pool {
  /** Database primary key (UUID). */
  readonly id: string;
  readonly year: number;
  readonly members: readonly PoolMember[];
}
