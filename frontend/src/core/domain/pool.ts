/** Input for creating a pool member. */
export interface PoolMemberInput {
  readonly shipId: string;
  readonly cbBefore: number;
}

/** A single member within a compliance pool. */
export interface PoolMember {
  readonly shipId: string;
  readonly cbBefore: number;
  readonly cbAfter: number;
}

/**
 * A compliance pool per Article 21 (Pooling).
 */
export interface Pool {
  readonly id: string;
  readonly year: number;
  readonly members: readonly PoolMember[];
}

/** Result returned after pool creation. */
export interface PoolResult {
  readonly pool: Pool;
  readonly totalCbBefore: number;
  readonly totalCbAfter: number;
}
