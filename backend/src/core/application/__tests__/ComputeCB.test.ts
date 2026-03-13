import { ComputeCB } from '../ComputeCB';
import type { IRouteRepository } from '@core/ports/outbound/route-repository.port';
import type { IComplianceRepository } from '@core/ports/outbound/compliance-repository.port';
import type { Route } from '@core/domain';

const TARGET_INTENSITY = 89.3368;
const MJ_PER_TONNE = 41_000;

/** Helper: build a minimal Route for testing. */
function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'uuid-001',
    routeId: 'R001',
    vesselType: 'Container',
    fuelType: 'HFO',
    year: 2024,
    ghgIntensity: 91.0,
    fuelConsumption: 5000,
    distance: 12000,
    totalEmissions: 4500,
    isBaseline: false,
    ...overrides,
  };
}

function createMocks() {
  const routeRepo: jest.Mocked<IRouteRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBaseline: jest.fn(),
    setBaseline: jest.fn(),
    findComparison: jest.fn(),
  };

  const complianceRepo: jest.Mocked<IComplianceRepository> = {
    saveCB: jest.fn(),
    findCB: jest.fn(),
  };

  return { routeRepo, complianceRepo };
}

describe('ComputeCB', () => {
  it('should compute a negative CB (deficit) for a high-intensity route', async () => {
    const { routeRepo, complianceRepo } = createMocks();
    const route = makeRoute({ ghgIntensity: 91.0, fuelConsumption: 5000 });

    routeRepo.findById.mockResolvedValue(route);
    complianceRepo.saveCB.mockImplementation(async (cb) => ({
      id: 'saved-uuid',
      ...cb,
    }));

    const useCase = new ComputeCB(routeRepo, complianceRepo);
    const result = await useCase.execute(route.id, 2024);

    // (89.3368 - 91.0) * (5000 * 41000) = -1.6632 * 205_000_000 = -340_956_000
    const expectedCB = (TARGET_INTENSITY - 91.0) * (5000 * MJ_PER_TONNE);

    expect(result.cbGco2eq).toBeCloseTo(expectedCB, 2);
    expect(result.surplus).toBe(false);
    expect(result.shipId).toBe('R001');
    expect(result.year).toBe(2024);

    expect(complianceRepo.saveCB).toHaveBeenCalledWith({
      shipId: 'R001',
      year: 2024,
      cbGco2eq: expect.closeTo(expectedCB, 2),
    });
  });

  it('should compute a positive CB (surplus) for a low-intensity route', async () => {
    const { routeRepo, complianceRepo } = createMocks();
    const route = makeRoute({
      routeId: 'R002',
      ghgIntensity: 88.0,
      fuelConsumption: 4800,
    });

    routeRepo.findById.mockResolvedValue(route);
    complianceRepo.saveCB.mockImplementation(async (cb) => ({
      id: 'saved-uuid',
      ...cb,
    }));

    const useCase = new ComputeCB(routeRepo, complianceRepo);
    const result = await useCase.execute(route.id, 2024);

    // (89.3368 - 88.0) * (4800 * 41000) = 1.3368 * 196_800_000 = 263_082_240
    const expectedCB = (TARGET_INTENSITY - 88.0) * (4800 * MJ_PER_TONNE);

    expect(result.cbGco2eq).toBeCloseTo(expectedCB, 2);
    expect(result.surplus).toBe(true);
    expect(result.shipId).toBe('R002');
  });

  it('should throw when route is not found', async () => {
    const { routeRepo, complianceRepo } = createMocks();
    routeRepo.findById.mockResolvedValue(null);

    const useCase = new ComputeCB(routeRepo, complianceRepo);

    await expect(useCase.execute('nonexistent-id', 2024)).rejects.toThrow(
      'Route not found: nonexistent-id',
    );

    expect(complianceRepo.saveCB).not.toHaveBeenCalled();
  });
});
