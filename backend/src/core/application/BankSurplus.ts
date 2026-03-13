import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import type { BankEntry } from '@core/domain';

export interface BankSurplusInput {
  readonly shipId: string;
  readonly year: number;
  readonly amount: number;
}

/**
 * Use-case: bank a positive compliance surplus (Article 20).
 *
 * Validates that the ship actually has enough surplus CB to bank the
 * requested amount, then persists a new bank entry.
 */
export class BankSurplus {
  constructor(
    private readonly complianceRepo: IComplianceRepository,
    private readonly bankRepo: IBankRepository,
  ) {}

  async execute(input: BankSurplusInput): Promise<BankEntry> {
    const { shipId, year, amount } = input;

    if (amount <= 0) {
      throw new Error('Bank amount must be positive');
    }

    const cb = await this.complianceRepo.findCB(shipId, year);

    if (!cb) {
      throw new Error(`No compliance balance found for ship ${shipId} in ${year}`);
    }

    if (cb.cbGco2eq < amount) {
      throw new Error(
        `Insufficient surplus: CB is ${cb.cbGco2eq} but tried to bank ${amount}`,
      );
    }

    return this.bankRepo.save({
      shipId,
      year,
      amountGco2eq: amount,
      applied: false,
    });
  }
}
