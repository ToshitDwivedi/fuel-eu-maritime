import type { Pool, PoolMember } from '@core/domain';
import type { IPoolRepository } from '@core/ports/outbound/pool-repository.port';

export interface CreatePoolInput {
  readonly year: number;
  readonly members: ReadonlyArray<{ readonly shipId: string; readonly cbBefore: number }>;
}

export interface CreatePoolResult {
  readonly poolId: string;
  readonly year: number;
  readonly members: readonly PoolMember[];
}

/**
 * Use-case: create a compliance pool with greedy surplus allocation (Article 21).
 *
 * Algorithm:
 *  1. Validate ∑ cbBefore ≥ 0
 *  2. Sort members descending by cbBefore (surplus ships first)
 *  3. Surplus ships donate their cbBefore into an accumulator, exit at 0
 *  4. Deficit ships pull from accumulator to cover their deficit
 *  5. Validate post-allocation invariants:
 *     - No deficit ship exits worse than it entered
 *     - No surplus ship exits negative
 */
export class CreatePool {
  constructor(private readonly poolRepo: IPoolRepository) {}

  async execute(input: CreatePoolInput): Promise<CreatePoolResult> {
    const { year, members } = input;

    if (members.length === 0) {
      throw new Error('Pool must have at least one member');
    }

    // Rule 1: ∑ cbBefore ≥ 0
    const totalCB = members.reduce((sum, m) => sum + m.cbBefore, 0);
    if (totalCB < 0) {
      throw new Error(
        `Pool sum is negative (${totalCB}): total CB must be >= 0`,
      );
    }

    // Sort descending by cbBefore — surplus ships first
    const sorted = [...members].sort((a, b) => b.cbBefore - a.cbBefore);

    // Greedy allocation
    let surplus = 0;
    const allocated: PoolMember[] = sorted.map((m) => {
      if (m.cbBefore >= 0) {
        // Surplus ship: donate everything into pool, exit at 0
        surplus += m.cbBefore;
        return { shipId: m.shipId, cbBefore: m.cbBefore, cbAfter: 0 };
      } else {
        // Deficit ship: pull from surplus accumulator
        const deficit = Math.abs(m.cbBefore);
        const covered = Math.min(deficit, surplus);
        surplus -= covered;
        const cbAfter = m.cbBefore + covered; // still ≤ 0
        return { shipId: m.shipId, cbBefore: m.cbBefore, cbAfter };
      }
    });

    // Rule 2: no deficit ship exits worse than it entered
    for (const m of allocated) {
      if (m.cbBefore < 0 && m.cbAfter < m.cbBefore) {
        throw new Error(
          `Deficit ship ${m.shipId} would exit worse: cbBefore=${m.cbBefore}, cbAfter=${m.cbAfter}`,
        );
      }
    }

    // Rule 3: no surplus ship exits negative
    for (const m of allocated) {
      if (m.cbBefore >= 0 && m.cbAfter < 0) {
        throw new Error(
          `Surplus ship ${m.shipId} would exit negative: cbAfter=${m.cbAfter}`,
        );
      }
    }

    // Persist
    const pool = await this.poolRepo.createPool(year);
    const saved = await this.poolRepo.addMembers(pool.id, allocated);

    return {
      poolId: saved.id,
      year: saved.year,
      members: saved.members,
    };
  }
}
