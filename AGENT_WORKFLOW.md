# AI Agent Workflow Log

## Agents Used

| Agent | Role | Usage Context |
|-------|------|---------------|
| **Claude Code (Opus 4.6)** | Primary agent | Project scaffolding, architecture, domain modeling, use-case implementation, router wiring, integration tests, frontend components, documentation |
| **GitHub Copilot** | Inline assistant | Auto-completions for repetitive patterns (imports, type annotations, Tailwind class strings), quick boilerplate fill |

---

## Prompts & Outputs

### Prompt 1 — Domain Entities & Port Interfaces

**Prompt:**
```
In /backend/src/core/domain/, create TypeScript types/interfaces (no classes, pure data):
1. Route entity: routeId, vesselType, fuelType, year, ghgIntensity, fuelConsumption, distance, totalEmissions, isBaseline
2. ComplianceBalance: shipId, year, cbGco2eq (positive=surplus, negative=deficit)
3. BankEntry: id, shipId, year, amountGco2eq, applied
4. Pool: id, year, members: PoolMember[]
5. PoolMember: shipId, cbBefore, cbAfter

In /backend/src/core/ports/, create interfaces:
- IRouteRepository: findAll, findById, findBaseline, setBaseline, findComparison
- IComplianceRepository: saveCB, findCB
- IBankRepository: save, findByShip, findAvailable, markApplied
- IPoolRepository: createPool, addMembers
```

**Output:**
- 5 domain files with `readonly` properties throughout, `VesselType` and `FuelType` as union types
- 4 port interface files with correct generics (`Omit<ComplianceBalance, 'id'>` for auto-generated UUIDs)
- `RouteComparison` added as a derived type (computed, not persisted) — agent inferred this from the comparison endpoint spec
- Barrel exports in `index.ts` for both domain and ports

**Key Insight:** Agent read all 5 SQL migration files in parallel before generating types, ensuring perfect DB alignment without manual cross-referencing.

---

### Prompt 2 — ComputeCB Use-Case with Unit Tests

**Prompt:**
```
In /backend/src/core/application/ComputeCB.ts, create a use-case class:
Formula: TARGET_INTENSITY = 89.3368, energyInScope = fuelConsumption * 41000,
CB = (TARGET - actual) * energyInScope.
Takes routeId, year. Fetches route via IRouteRepository, computes CB, saves via
IComplianceRepository, returns { shipId, year, cbGco2eq, surplus }.
Constructor injection for both repos. Write unit test with surplus, deficit,
and route-not-found scenarios.
```

**Output:**
```typescript
// ComputeCB.ts (generated snippet)
export class ComputeCB {
  constructor(
    private readonly routeRepo: IRouteRepository,
    private readonly complianceRepo: IComplianceRepository,
  ) {}

  async execute(routeId: string, year: number): Promise<ComputeCBResult> {
    const route = await this.routeRepo.findById(routeId);
    if (!route) throw new Error(`Route not found: ${routeId}`);

    const energyInScope = route.fuelConsumption * MJ_PER_TONNE;
    const cbGco2eq = (TARGET_INTENSITY - route.ghgIntensity) * energyInScope;

    await this.complianceRepo.saveCB({
      shipId: route.routeId, year, cbGco2eq,
    });

    return { shipId: route.routeId, year, cbGco2eq, surplus: cbGco2eq >= 0 };
  }
}
```
- 3 unit tests all passing: deficit (HFO at 91.0 → −340,956,000), surplus (LNG at 88.0 → +263,082,240), not-found error

---

### Prompt 3 — CreatePool with Greedy Allocation (Article 21)

**Prompt:**
```
In /backend/src/core/application/CreatePool.ts:
Input: { year, members: Array<{ shipId, cbBefore }> }.
Validation: sum cbBefore >= 0, no deficit ship exits worse, no surplus ship exits negative.
Greedy allocation: sort desc by cbBefore, surplus ships donate to accumulator (exit at 0),
deficit ships pull from accumulator.
Save to IPoolRepository. Return { poolId, year, members with cbAfter }.
Tests: valid pool with surplus + deficit, sum < 0 throws, surplus ship going negative throws.
```

**Output:**
```typescript
// Greedy allocation algorithm (generated snippet)
let accumulator = 0;
for (const m of sorted) {
  if (m.cbBefore > 0) {
    accumulator += m.cbBefore;
    allocated.push({ ...m, cbAfter: 0 });
  } else {
    const fill = Math.min(accumulator, Math.abs(m.cbBefore));
    accumulator -= fill;
    allocated.push({ ...m, cbAfter: m.cbBefore + fill });
  }
}
```
- 8 tests passing: 4 happy paths (full coverage, partial coverage, multi-ship, all-surplus) + 4 edge cases (sum < 0, empty members, zero-CB member, surplus exhaustion)

---

### Prompt 4 — Integration Tests with In-Memory Repositories

**Prompt:**
```
In /backend/src/__tests__/integration/, create supertest tests for all endpoints.
Use in-memory mock repositories. Cover: GET /routes (5 seeded), POST baseline,
GET comparison, GET compliance/cb, POST banking/bank (valid + over-CB + zero),
POST banking/apply, POST pools (valid + sum < 0). Each test isolated via beforeEach.
```

**Output:**
- 4 in-memory repository classes implementing exact port interfaces
- 25 integration tests across 8 describe blocks with fresh repos per test
- Multi-step workflow tests: compute CB → bank surplus → apply banked → verify adjusted-cb

**Bugs Found During Testing:**
- `bankingRouter.ts`: 404 catch didn't match "No compliance balance" error message → fixed string check
- `adjusted-cb` test: expected partial apply (30M) but `ApplyBanked` marks full entries (50M) → corrected expectation
- `jest.config.ts`: testMatch glob `**/__tests__/**/*.ts` accidentally matched `helpers.ts` → narrowed to `**/*.test.ts`

---

### Prompt 5 — Frontend PoolingTab with Dynamic Members

**Prompt:**
```
Create /frontend/src/adapters/ui/PoolingTab.tsx:
State: year input, members array [{shipId, cbBefore}], poolResult
UI: Year selector, "Add Member" button, members table with editable shipId + cbBefore,
Pool Sum indicator (green/red), "Create Pool" button disabled if sum < 0 or invalid.
Use validatePool from core/application (no API call) for in-memory validation.
```

**Output:**
- Dynamic form with stable React keys (module-level counter), controlled string inputs for cbBefore
- Imported `validatePool` from `@core/application` — reused existing pure function, no duplicate logic
- Cascading disabled-state help text explaining exactly why button is disabled at each stage
- `cbAfterMap` (Map<string, number>) cleared on every input change to prevent stale results

---

## Validation / Corrections

### Case 1: Integration Test Exposed Banking Router Bug
The `bankingRouter.ts` error handler checked for `"not found"` in error messages to return 404, but `ComputeCB` throws `"No compliance balance found"` — a message that didn't match. The integration test caught this as a 500 instead of 404. **Fix:** Added `"No compliance balance"` to the 404 error-message matching logic.

### Case 2: ApplyBanked Entry-Level vs Partial Apply Semantics
Initial integration test expected that applying 30M against a 50M bank entry would leave 20M remaining. However, the `ApplyBanked` use-case marks entire entries as applied (not partial amounts). **Fix:** Updated test expectation to reflect entry-level semantics — requesting applies that exactly consume entries, and verifying the full amount is applied.

### Case 3: Chart.js Annotation Plugin Missing
Agent initially attempted to draw the target reference line at 89.3368 using only core Chart.js. The horizontal line wasn't rendering because Chart.js doesn't natively support annotations. **Fix:** Agent identified the need for `chartjs-plugin-annotation` as a separate package, installed it, registered it, and configured a dashed orange line at the correct y-value — all in the same correction pass.

---

## Observations

### Where Agent Saved Time
- **Project scaffolding:** Monorepo structure, TypeScript strict config, ESLint flat-config, Jest path aliases — completed in under 2 minutes vs 30-60 minutes manually
- **Boilerplate generation:** Express app wiring, pg pool setup, migration runners, Vite config — well-established patterns produced correctly on first pass
- **Domain modeling:** Agent read SQL migrations in parallel and generated aligned TypeScript interfaces in a single pass
- **Test generation:** 49 tests across 5 suites with correct mocking patterns (`jest.Mocked<>`, `toBeCloseTo`, `toHaveBeenNthCalledWith`) — all idiomatic Jest
- **Frontend components:** 4 tab components with data fetching, error handling, loading states, and Tailwind styling — consistent patterns across all tabs

### Where Agent Failed or Needed Guidance
- **Complex pooling allocation logic:** While the greedy algorithm was correct, the post-allocation invariant checks needed manual verification by hand-tracing the accumulator through 4-ship test scenarios
- **Regulation-specific semantics:** CB formula constants, banking rules (Article 20), and pooling constraints (Article 21) all required cross-referencing against the EU regulation text — agent approximated but couldn't guarantee regulatory compliance
- **Integration test edge cases:** 3 bugs were only caught when the full system (routers + use-cases + repositories) was wired together — unit tests alone wouldn't have found the banking router 404 mismatch
- **Third-party library integration:** Chart.js annotation plugin wasn't auto-suggested; required human knowledge that annotations are a separate package

---

## Best Practices Followed

1. **Interfaces first, implementations second:** Defined domain types and port interfaces before any use-case or adapter code — the agent performs best when given clear contracts to implement against
2. **Incremental prompts:** Each prompt targeted a single architectural layer or feature — smaller, focused prompts produce more accurate results than broad instructions
3. **Parallel file exploration:** Agent read backend migrations, domain types, and port interfaces in parallel before generating aligned frontend code — ensured cross-stack consistency
4. **Test alongside implementation:** Generated unit tests in the same prompt as use-cases — caught formula errors immediately through tight alignment between implementation and test expectations
5. **Manual verification of business logic:** Every formula and allocation algorithm was hand-calculated against expected values to validate correctness beyond what automated tests can guarantee
6. **Hexagonal boundary enforcement:** Verified after every generation step that `core/` never imports from `adapters/` or `infrastructure/` — the agent maintained this boundary but human review confirmed it
