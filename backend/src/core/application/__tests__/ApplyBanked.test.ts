import { ApplyBanked } from '../ApplyBanked';
import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { BankEntry, ComplianceBalance } from '@core/domain';

function createMocks() {
  const bankRepo: jest.Mocked<IBankRepository> = {
    save: jest.fn(),
    findByShip: jest.fn(),
    findAvailable: jest.fn(),
    markApplied: jest.fn(),
  };

  const complianceRepo: jest.Mocked<IComplianceRepository> = {
    saveCB: jest.fn(),
    findCB: jest.fn(),
  };

  return { bankRepo, complianceRepo };
}

function makeEntry(overrides: Partial<BankEntry> = {}): BankEntry {
  return {
    id: 'entry-1',
    shipId: 'R001',
    year: 2024,
    amountGco2eq: 100_000,
    applied: false,
    ...overrides,
  };
}

function makeCB(overrides: Partial<ComplianceBalance> = {}): ComplianceBalance {
  return {
    id: 'cb-uuid',
    shipId: 'R001',
    year: 2024,
    cbGco2eq: -300_000,
    ...overrides,
  };
}

describe('ApplyBanked', () => {
  it('should apply banked entries smallest-first and return result', async () => {
    const { bankRepo, complianceRepo } = createMocks();

    // Ship has a deficit of -300,000
    complianceRepo.findCB.mockResolvedValue(makeCB({ cbGco2eq: -300_000 }));

    // Three available entries of varying sizes
    const entries = [
      makeEntry({ id: 'e1', amountGco2eq: 200_000 }),
      makeEntry({ id: 'e2', amountGco2eq: 50_000 }),
      makeEntry({ id: 'e3', amountGco2eq: 150_000 }),
    ];
    bankRepo.findAvailable.mockResolvedValue(entries);
    bankRepo.markApplied.mockImplementation(async (id) =>
      ({ ...entries.find((e) => e.id === id)!, applied: true }),
    );

    const useCase = new ApplyBanked(bankRepo, complianceRepo);
    const result = await useCase.execute({
      shipId: 'R001',
      year: 2024,
      amount: 300_000,
    });

    expect(result.applied).toBe(300_000);
    // total available = 400,000; applied = 300,000; remaining = 100,000
    expect(result.remaining).toBe(100_000);
    // CB was -300,000 + 300,000 applied = 0
    expect(result.cbAfter).toBe(0);

    // Sorted ascending: 50k, 150k, 200k → all three consumed to reach 300k
    expect(bankRepo.markApplied).toHaveBeenCalledTimes(3);
    // First call should be the smallest entry
    expect(bankRepo.markApplied).toHaveBeenNthCalledWith(1, 'e2'); // 50k
    expect(bankRepo.markApplied).toHaveBeenNthCalledWith(2, 'e3'); // 150k
    expect(bankRepo.markApplied).toHaveBeenNthCalledWith(3, 'e1'); // 200k
  });

  it('should partially consume entries when amount < total available', async () => {
    const { bankRepo, complianceRepo } = createMocks();

    complianceRepo.findCB.mockResolvedValue(makeCB({ cbGco2eq: -100_000 }));

    const entries = [
      makeEntry({ id: 'e1', amountGco2eq: 80_000 }),
      makeEntry({ id: 'e2', amountGco2eq: 200_000 }),
    ];
    bankRepo.findAvailable.mockResolvedValue(entries);
    bankRepo.markApplied.mockImplementation(async (id) =>
      ({ ...entries.find((e) => e.id === id)!, applied: true }),
    );

    const useCase = new ApplyBanked(bankRepo, complianceRepo);
    const result = await useCase.execute({
      shipId: 'R001',
      year: 2024,
      amount: 100_000,
    });

    expect(result.applied).toBe(100_000);
    // total available = 280,000; applied = 100,000; remaining = 180,000
    expect(result.remaining).toBe(180_000);
    // CB was -100,000 + 100,000 = 0
    expect(result.cbAfter).toBe(0);

    // Sorted: 80k first (fully consumed), then 200k (partially needed for 20k)
    expect(bankRepo.markApplied).toHaveBeenCalledTimes(2);
    expect(bankRepo.markApplied).toHaveBeenNthCalledWith(1, 'e1');
    expect(bankRepo.markApplied).toHaveBeenNthCalledWith(2, 'e2');
  });

  it('should throw when amount is zero', async () => {
    const { bankRepo, complianceRepo } = createMocks();
    const useCase = new ApplyBanked(bankRepo, complianceRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 0 }),
    ).rejects.toThrow('Apply amount must be positive');

    expect(bankRepo.findAvailable).not.toHaveBeenCalled();
  });

  it('should throw when amount is negative', async () => {
    const { bankRepo, complianceRepo } = createMocks();
    const useCase = new ApplyBanked(bankRepo, complianceRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: -50 }),
    ).rejects.toThrow('Apply amount must be positive');
  });

  it('should throw when no CB record exists', async () => {
    const { bankRepo, complianceRepo } = createMocks();
    complianceRepo.findCB.mockResolvedValue(null);

    const useCase = new ApplyBanked(bankRepo, complianceRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 100 }),
    ).rejects.toThrow('No compliance balance found for ship R001 in 2024');

    expect(bankRepo.findAvailable).not.toHaveBeenCalled();
  });

  it('should throw when requested amount exceeds available banked surplus', async () => {
    const { bankRepo, complianceRepo } = createMocks();

    complianceRepo.findCB.mockResolvedValue(makeCB({ cbGco2eq: -500_000 }));

    bankRepo.findAvailable.mockResolvedValue([
      makeEntry({ id: 'e1', amountGco2eq: 100_000 }),
      makeEntry({ id: 'e2', amountGco2eq: 50_000 }),
    ]);

    const useCase = new ApplyBanked(bankRepo, complianceRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 200_000 }),
    ).rejects.toThrow(
      'Insufficient banked surplus: available 150000 but tried to apply 200000',
    );

    expect(bankRepo.markApplied).not.toHaveBeenCalled();
  });

  it('should throw when no banked entries are available', async () => {
    const { bankRepo, complianceRepo } = createMocks();

    complianceRepo.findCB.mockResolvedValue(makeCB({ cbGco2eq: -100_000 }));
    bankRepo.findAvailable.mockResolvedValue([]);

    const useCase = new ApplyBanked(bankRepo, complianceRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 100 }),
    ).rejects.toThrow('Insufficient banked surplus: available 0 but tried to apply 100');
  });
});
