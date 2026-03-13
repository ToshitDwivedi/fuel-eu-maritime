import { BankSurplus } from '../BankSurplus';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { IBankRepository } from '@core/ports/outbound/bank-repository.port';
import type { ComplianceBalance } from '@core/domain';

function createMocks() {
  const complianceRepo: jest.Mocked<IComplianceRepository> = {
    saveCB: jest.fn(),
    findCB: jest.fn(),
  };

  const bankRepo: jest.Mocked<IBankRepository> = {
    save: jest.fn(),
    findByShip: jest.fn(),
    findAvailable: jest.fn(),
    markApplied: jest.fn(),
  };

  return { complianceRepo, bankRepo };
}

function makeCB(overrides: Partial<ComplianceBalance> = {}): ComplianceBalance {
  return {
    id: 'cb-uuid',
    shipId: 'R001',
    year: 2024,
    cbGco2eq: 500_000,
    ...overrides,
  };
}

describe('BankSurplus', () => {
  it('should bank surplus when CB >= amount', async () => {
    const { complianceRepo, bankRepo } = createMocks();
    complianceRepo.findCB.mockResolvedValue(makeCB({ cbGco2eq: 1_000_000 }));
    bankRepo.save.mockImplementation(async (entry) => ({
      id: 'bank-uuid',
      ...entry,
    }));

    const useCase = new BankSurplus(complianceRepo, bankRepo);
    const result = await useCase.execute({
      shipId: 'R001',
      year: 2024,
      amount: 500_000,
    });

    expect(result.amountGco2eq).toBe(500_000);
    expect(result.applied).toBe(false);
    expect(result.shipId).toBe('R001');

    expect(bankRepo.save).toHaveBeenCalledWith({
      shipId: 'R001',
      year: 2024,
      amountGco2eq: 500_000,
      applied: false,
    });
  });

  it('should throw when amount is zero', async () => {
    const { complianceRepo, bankRepo } = createMocks();
    const useCase = new BankSurplus(complianceRepo, bankRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 0 }),
    ).rejects.toThrow('Bank amount must be positive');

    expect(complianceRepo.findCB).not.toHaveBeenCalled();
  });

  it('should throw when amount is negative', async () => {
    const { complianceRepo, bankRepo } = createMocks();
    const useCase = new BankSurplus(complianceRepo, bankRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: -100 }),
    ).rejects.toThrow('Bank amount must be positive');
  });

  it('should throw when no CB record exists', async () => {
    const { complianceRepo, bankRepo } = createMocks();
    complianceRepo.findCB.mockResolvedValue(null);

    const useCase = new BankSurplus(complianceRepo, bankRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 100 }),
    ).rejects.toThrow('No compliance balance found for ship R001 in 2024');

    expect(bankRepo.save).not.toHaveBeenCalled();
  });

  it('should throw when CB is less than requested amount', async () => {
    const { complianceRepo, bankRepo } = createMocks();
    complianceRepo.findCB.mockResolvedValue(makeCB({ cbGco2eq: 200 }));

    const useCase = new BankSurplus(complianceRepo, bankRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 500 }),
    ).rejects.toThrow('Insufficient surplus: CB is 200 but tried to bank 500');

    expect(bankRepo.save).not.toHaveBeenCalled();
  });

  it('should throw when CB is negative (deficit)', async () => {
    const { complianceRepo, bankRepo } = createMocks();
    complianceRepo.findCB.mockResolvedValue(makeCB({ cbGco2eq: -1000 }));

    const useCase = new BankSurplus(complianceRepo, bankRepo);

    await expect(
      useCase.execute({ shipId: 'R001', year: 2024, amount: 100 }),
    ).rejects.toThrow('Insufficient surplus');

    expect(bankRepo.save).not.toHaveBeenCalled();
  });
});
