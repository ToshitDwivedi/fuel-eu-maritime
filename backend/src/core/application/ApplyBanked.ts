import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';

export interface ApplyBankedInput {
  readonly shipId: string;
  readonly year: number;
  readonly amount: number;
}

export interface ApplyBankedResult {
  /** Total amount actually applied from bank entries. */
  readonly applied: number;
  /** Remaining unapplied banked amount after this operation. */
  readonly remaining: number;
  /** Compliance balance after applying banked surplus. */
  readonly cbAfter: number;
}

/**
 * Use-case: apply banked surplus to offset a deficit (Article 20).
 *
 * Greedy strategy — applies smallest entries first so larger entries
 * stay available for future use.
 */
export class ApplyBanked {
  constructor(
    private readonly bankRepo: IBankRepository,
    private readonly complianceRepo: IComplianceRepository,
  ) {}

  async execute(input: ApplyBankedInput): Promise<ApplyBankedResult> {
    const { shipId, year, amount } = input;

    if (amount <= 0) {
      throw new Error('Apply amount must be positive');
    }

    const cb = await this.complianceRepo.findCB(shipId, year);

    if (!cb) {
      throw new Error(`No compliance balance found for ship ${shipId} in ${year}`);
    }

    const available = await this.bankRepo.findAvailable(shipId);
    const totalAvailable = available.reduce((sum, e) => sum + e.amountGco2eq, 0);

    if (totalAvailable < amount) {
      throw new Error(
        `Insufficient banked surplus: available ${totalAvailable} but tried to apply ${amount}`,
      );
    }

    // Greedy: sort ascending by amount so smallest entries are consumed first
    const sorted = [...available].sort((a, b) => a.amountGco2eq - b.amountGco2eq);

    let remaining = amount;

    for (const entry of sorted) {
      if (remaining <= 0) break;

      await this.bankRepo.markApplied(entry.id);
      remaining -= entry.amountGco2eq;
    }

    const applied = amount;

    return {
      applied,
      remaining: totalAvailable - applied,
      cbAfter: cb.cbGco2eq + applied,
    };
  }
}
