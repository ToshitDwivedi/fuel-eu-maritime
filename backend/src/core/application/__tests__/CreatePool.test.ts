import { CreatePool } from '../CreatePool';
import type { IPoolRepository } from '@core/ports/outbound/pool-repository.port';
import type { Pool, PoolMember } from '@core/domain';

function createMockPoolRepo() {
  const repo: jest.Mocked<IPoolRepository> = {
    createPool: jest.fn(),
    addMembers: jest.fn(),
  };

  // Default: createPool returns a pool shell, addMembers echoes back members
  repo.createPool.mockImplementation(async (year) => ({
    id: 'pool-uuid',
    year,
    members: [],
  }));

  repo.addMembers.mockImplementation(
    async (poolId: string, members: readonly PoolMember[]): Promise<Pool> => ({
      id: poolId,
      year: 2024,
      members,
    }),
  );

  return repo;
}

describe('CreatePool', () => {
  it('should allocate surplus to cover deficit (1 surplus + 1 deficit)', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    const result = await useCase.execute({
      year: 2024,
      members: [
        { shipId: 'S1', cbBefore: 500_000 },
        { shipId: 'S2', cbBefore: -300_000 },
      ],
    });

    expect(result.poolId).toBe('pool-uuid');
    expect(result.year).toBe(2024);
    expect(result.members).toHaveLength(2);

    // S1 (surplus): donates 500K, exits at 0
    const s1 = result.members.find((m) => m.shipId === 'S1');
    expect(s1?.cbBefore).toBe(500_000);
    expect(s1?.cbAfter).toBe(0);

    // S2 (deficit): receives 300K from pool, fully covered → exits at 0
    const s2 = result.members.find((m) => m.shipId === 'S2');
    expect(s2?.cbBefore).toBe(-300_000);
    expect(s2?.cbAfter).toBe(0);

    expect(repo.createPool).toHaveBeenCalledWith(2024);
    expect(repo.addMembers).toHaveBeenCalledWith('pool-uuid', expect.any(Array));
  });

  it('should partially cover deficit when surplus is insufficient', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    // Total = 200K - 150K = 50K ≥ 0
    const result = await useCase.execute({
      year: 2024,
      members: [
        { shipId: 'S1', cbBefore: 200_000 },
        { shipId: 'S2', cbBefore: -150_000 },
      ],
    });

    const s1 = result.members.find((m) => m.shipId === 'S1');
    expect(s1?.cbAfter).toBe(0);

    // deficit of 150K fully covered (surplus has 200K)
    const s2 = result.members.find((m) => m.shipId === 'S2');
    expect(s2?.cbAfter).toBe(0);
  });

  it('should handle multiple surplus and deficit ships', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    // S1: +400K, S2: +100K, S3: -300K, S4: -150K  → total = 50K ≥ 0
    const result = await useCase.execute({
      year: 2024,
      members: [
        { shipId: 'S3', cbBefore: -300_000 },
        { shipId: 'S1', cbBefore: 400_000 },
        { shipId: 'S4', cbBefore: -150_000 },
        { shipId: 'S2', cbBefore: 100_000 },
      ],
    });

    expect(result.members).toHaveLength(4);

    // Sorted desc: S1(+400K), S2(+100K), S3(-300K), S4(-150K)
    // Surplus accumulator: 0 → +400K → +500K → 200K (after covering S3) → 50K (after covering S4)
    const s1 = result.members.find((m) => m.shipId === 'S1');
    expect(s1?.cbAfter).toBe(0); // donated 400K

    const s2 = result.members.find((m) => m.shipId === 'S2');
    expect(s2?.cbAfter).toBe(0); // donated 100K

    const s3 = result.members.find((m) => m.shipId === 'S3');
    expect(s3?.cbAfter).toBe(0); // deficit of 300K fully covered

    const s4 = result.members.find((m) => m.shipId === 'S4');
    expect(s4?.cbAfter).toBe(0); // deficit of 150K fully covered
  });

  it('should leave deficit partially uncovered when surplus runs out', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    // S1: +100K, S2: -50K, S3: -40K  → total = 10K ≥ 0
    const result = await useCase.execute({
      year: 2024,
      members: [
        { shipId: 'S1', cbBefore: 100_000 },
        { shipId: 'S2', cbBefore: -50_000 },
        { shipId: 'S3', cbBefore: -40_000 },
      ],
    });

    const s2 = result.members.find((m) => m.shipId === 'S2');
    expect(s2?.cbAfter).toBe(0); // fully covered

    const s3 = result.members.find((m) => m.shipId === 'S3');
    expect(s3?.cbAfter).toBe(0); // fully covered (surplus was 100K, used 50K+40K=90K)
  });

  it('should throw when sum of cbBefore < 0', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    await expect(
      useCase.execute({
        year: 2024,
        members: [
          { shipId: 'S1', cbBefore: 100_000 },
          { shipId: 'S2', cbBefore: -200_000 },
        ],
      }),
    ).rejects.toThrow('Pool sum is negative (-100000): total CB must be >= 0');

    expect(repo.createPool).not.toHaveBeenCalled();
  });

  it('should throw when members array is empty', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    await expect(
      useCase.execute({ year: 2024, members: [] }),
    ).rejects.toThrow('Pool must have at least one member');
  });

  it('should handle all-surplus pool (no deficits)', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    const result = await useCase.execute({
      year: 2024,
      members: [
        { shipId: 'S1', cbBefore: 200_000 },
        { shipId: 'S2', cbBefore: 300_000 },
      ],
    });

    const s1 = result.members.find((m) => m.shipId === 'S1');
    expect(s1?.cbAfter).toBe(0);

    const s2 = result.members.find((m) => m.shipId === 'S2');
    expect(s2?.cbAfter).toBe(0);
  });

  it('should handle pool with zero-CB members', async () => {
    const repo = createMockPoolRepo();
    const useCase = new CreatePool(repo);

    const result = await useCase.execute({
      year: 2024,
      members: [
        { shipId: 'S1', cbBefore: 100_000 },
        { shipId: 'S2', cbBefore: 0 },
        { shipId: 'S3', cbBefore: -50_000 },
      ],
    });

    const s2 = result.members.find((m) => m.shipId === 'S2');
    expect(s2?.cbBefore).toBe(0);
    expect(s2?.cbAfter).toBe(0); // zero stays zero

    const s3 = result.members.find((m) => m.shipId === 'S3');
    expect(s3?.cbAfter).toBe(0); // fully covered
  });
});
