import type { Pool, PoolMember } from '@core/domain';

/** Outbound port for pooling persistence (Article 21). */
export interface IPoolRepository {
  /** Create a new pool record for the given year. Returns the pool with its id. */
  createPool(year: number): Promise<Pool>;

  /** Add members to an existing pool and return the complete pool. */
  addMembers(poolId: string, members: readonly PoolMember[]): Promise<Pool>;
}
