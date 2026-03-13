# AI Agent Workflow Log

## Agents Used

| Agent | Version | Purpose |
|-------|---------|---------|
| Claude Code (Opus 4.6) | Latest | Project scaffolding, architecture design, code generation, documentation |

## Prompts & Outputs

### Prompt 1 — Monorepo Scaffolding

**Prompt:**
> Create a monorepo with two folders: /frontend and /backend. In /backend, initialize a Node.js + TypeScript project with: strict TypeScript config, ESLint + Prettier, Express, pg (node-postgres), dotenv, zod, Jest + ts-jest + supertest for testing. Create the exact hexagonal folder structure [...]

**Output:**
- Complete backend project with `package.json`, `tsconfig.json` (strict mode), `eslint.config.mjs`, `.prettierrc`, `jest.config.ts`
- Hexagonal folder structure: `core/domain`, `core/application`, `core/ports/inbound`, `core/ports/outbound`, `adapters/inbound/http`, `adapters/outbound/postgres`, `infrastructure/db`, `infrastructure/server`
- Infrastructure wiring: Express app, pg pool, migration/seed runners
- All dependencies installed in a single pass

**Validation:**
- Verified folder structure matches spec
- Confirmed `tsconfig.json` has `strict: true` and all recommended strict flags
- Checked ESLint config uses `strictTypeChecked` ruleset
- Confirmed all npm packages installed without errors

### Prompt 2 — Documentation & Initial Push

**Prompt:**
> Push it to https://github.com/ToshitDwivedi/fuel-eu-maritime.git with basic documentation

**Output:**
- Generated `README.md` with architecture overview, setup instructions, API endpoints, and seed data
- Generated `AGENT_WORKFLOW.md` (this file)
- Generated `REFLECTION.md`
- Initialized git repo and pushed to remote

### Prompt 3 — Domain Entities & Outbound Port Interfaces

**Prompt:**
> In /backend/src/core/domain/, create TypeScript types/interfaces (no classes, pure data):
> 1. Route entity: routeId, vesselType, fuelType, year, ghgIntensity, fuelConsumption, distance, totalEmissions, isBaseline
> 2. ComplianceBalance: shipId, year, cbGco2eq (positive=surplus, negative=deficit)
> 3. BankEntry: id, shipId, year, amountGco2eq, applied
> 4. Pool: id, year, members: PoolMember[]
> 5. PoolMember: shipId, cbBefore, cbAfter
>
> In /backend/src/core/ports/, create interfaces:
> - IRouteRepository: findAll, findById, findBaseline, setBaseline, findComparison
> - IComplianceRepository: saveCB, findCB
> - IBankRepository: save, findByShip, findAvailable, markApplied
> - IPoolRepository: createPool, addMembers

**Output:**
- 5 domain files: `route.ts` (Route, RouteComparison, VesselType, FuelType), `compliance.ts` (ComplianceBalance), `bank-entry.ts` (BankEntry), `pool.ts` (Pool, PoolMember), `index.ts` (barrel)
- 5 port files: `route-repository.port.ts` (IRouteRepository), `compliance-repository.port.ts` (IComplianceRepository), `bank-repository.port.ts` (IBankRepository), `pool-repository.port.ts` (IPoolRepository), `index.ts` (barrel)
- All properties marked `readonly`, all `Route` fields aligned 1:1 with DB migration columns
- `VesselType` and `FuelType` defined as union types matching seed data values
- `RouteComparison` added as a derived type for the comparison endpoint (not in DB, computed)
- `IRouteRepository.findAll` accepts optional filter object with `vesselType`, `fuelType`, `year`
- `IComplianceRepository.saveCB` uses `Omit<ComplianceBalance, 'id'>` so the DB generates the UUID

**Validation:**
- Cross-referenced every interface field against the 5 SQL migration files to ensure exact alignment
- Ran `npx tsc --noEmit` — zero errors under strict mode
- Confirmed zero framework imports in all domain and port files (only `@core/domain` imports in ports)
- Verified barrel exports re-export all types correctly

### Prompt 4 — ComputeCB Use-Case & Unit Tests

**Prompt:**
> In /backend/src/core/application/ComputeCB.ts, create a use-case class:
> Formula: TARGET_INTENSITY = 89.3368, energyInScope = fuelConsumption * 41000, CB = (TARGET - actual) * energyInScope.
> Takes routeId, year. Fetches route via IRouteRepository, computes CB, saves via IComplianceRepository, returns { shipId, year, cbGco2eq, surplus }.
> Constructor injection for both repos. Write unit test with surplus, deficit, and route-not-found scenarios.

**Output:**
- `ComputeCB.ts`: use-case class with constructor-injected `IRouteRepository` and `IComplianceRepository`
- Constants extracted: `TARGET_INTENSITY = 89.3368`, `MJ_PER_TONNE = 41_000`
- `ComputeCBResult` interface returned from `execute()` with `surplus: boolean` derived from `cbGco2eq >= 0`
- Maps `route.routeId` → `shipId` when saving to compliance (business key, not UUID)
- `__tests__/ComputeCB.test.ts`: 3 test cases with fully mocked repositories
  - Deficit: HFO route at 91.0 gCO₂e/MJ → negative CB (-340,956,000 gCO₂eq)
  - Surplus: LNG route at 88.0 gCO₂e/MJ → positive CB (263,082,240 gCO₂eq)
  - Not-found: throws `"Route not found: <id>"`, verifies `saveCB` is never called

**Validation:**
- `npx tsc --noEmit` — zero errors
- `npx jest --verbose` — 3/3 tests passing
- Hand-calculated deficit: (89.3368 − 91.0) × (5000 × 41000) = −340,956,000 ✓
- Hand-calculated surplus: (89.3368 − 88.0) × (4800 × 41000) = 263,082,240 ✓
- Confirmed use-case imports only port interfaces and domain types (no Express, no pg)

### Prompt 5 — BankSurplus & ApplyBanked Use-Cases with Unit Tests

**Prompt:**
> In /backend/src/core/application/, create two use-cases:
> 1. BankSurplus.ts — Input: { shipId, year, amount }. Validate: current CB >= amount (fetch from IComplianceRepository), amount > 0. Save to IBankRepository. Throw descriptive errors if invalid.
> 2. ApplyBanked.ts — Input: { shipId, year, amount }. Fetch available (unapplied) bank entries for shipId. Validate total available >= requested amount. Mark entries as applied (greedy: apply smallest first). Return { applied, remaining, cb_after }.
> Write unit tests for both — including edge cases: applying more than available, zero amount, happy path.

**Output:**
- `BankSurplus.ts`: use-case with constructor-injected `IComplianceRepository` and `IBankRepository`
  - Validates amount > 0 before any DB calls
  - Fetches CB via `findCB`, checks existence, then checks `cbGco2eq >= amount`
  - Saves entry with `applied: false` via `bankRepo.save`
  - 3 distinct error paths: zero/negative amount, no CB record, insufficient surplus
- `ApplyBanked.ts`: use-case with constructor-injected `IBankRepository` and `IComplianceRepository`
  - Validates amount > 0, fetches CB, fetches available entries via `findAvailable`
  - Greedy smallest-first: sorts entries ascending by `amountGco2eq`, marks consumed entries via `markApplied`
  - Returns `{ applied, remaining, cbAfter }` where `remaining` = total banked - applied, `cbAfter` = CB + applied
- `__tests__/BankSurplus.test.ts`: 6 tests
  - Happy path: CB 1M, bank 500K → saved correctly
  - Zero amount → throws before any repo call
  - Negative amount → throws
  - No CB record → throws, save never called
  - CB < requested → throws with descriptive message
  - Negative CB (deficit) → throws "insufficient surplus"
- `__tests__/ApplyBanked.test.ts`: 7 tests
  - Happy path: 3 entries (50K, 150K, 200K), apply 300K → smallest-first order verified
  - Partial consumption: 2 entries, apply less than total
  - Zero amount → throws
  - Negative amount → throws
  - No CB record → throws
  - Over-apply: available 150K, request 200K → throws
  - Empty entries: no banked entries at all → throws

**Validation:**
- `npx tsc --noEmit` — zero errors
- `npx jest --verbose` — 16/16 tests passing across 3 suites (ComputeCB + BankSurplus + ApplyBanked)
- Both use-cases import only port interfaces and domain types — zero framework deps
- Verified guard-clause ordering: amount validation → CB lookup → business-rule check
- Confirmed `markApplied` call order in ApplyBanked tests matches smallest-first sort

## Validation / Corrections

| Step | What was checked | Result |
|------|-----------------|--------|
| TypeScript config | `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride` | Correct |
| ESLint | Uses `typescript-eslint` strict + prettier compat | Correct |
| Folder structure | Matches hexagonal spec exactly | Correct |
| Dependencies | All runtime + dev deps installed, 0 vulnerabilities | Correct |
| Express wiring | `app.ts` imports router, `index.ts` loads dotenv first | Correct |
| Domain types | All fields match DB migration columns, `readonly` throughout | Correct |
| Port interfaces | Only import from `@core/domain`, zero framework deps | Correct |
| Type compilation | `tsc --noEmit` passes with strict mode, zero errors | Correct |
| ComputeCB formula | Hand-verified deficit & surplus calculations against spec | Correct |
| ComputeCB tests | 3/3 pass: deficit, surplus, not-found error | Correct |
| Use-case isolation | ComputeCB imports only ports/domain — no framework deps | Correct |
| BankSurplus guards | 3 error paths: zero amount, no CB, insufficient surplus | Correct |
| ApplyBanked greedy | Smallest-first sort verified via `toHaveBeenNthCalledWith` | Correct |
| BankSurplus tests | 6/6 pass: happy path + 5 edge cases | Correct |
| ApplyBanked tests | 7/7 pass: happy path + partial + 5 edge cases | Correct |
| All tests combined | 16/16 pass across 3 suites | Correct |

## Observations

### Where the agent saved time
- Project scaffolding (folder structure, configs, boilerplate) completed in under 2 minutes
- TypeScript strict config with all recommended flags generated correctly first try
- ESLint flat-config format (eslint.config.mjs) with typescript-eslint v8 — avoids common setup mistakes
- Domain modeling from spec + migrations: agent read all 5 SQL migration files in parallel, then generated aligned TypeScript interfaces in a single pass — no manual cross-referencing needed
- Port interfaces generated with correct generics (`Omit<ComplianceBalance, 'id'>`) and filter types on first attempt
- Use-case class with constructor injection, formula implementation, and return type generated in one pass — agent correctly mapped `route.routeId` to `shipId` without being told
- Test file with `jest.Mocked<>` typed mocks, `toBeCloseTo` for floating-point, and `expect.closeTo` in `toHaveBeenCalledWith` — all idiomatic Jest patterns produced correctly first try
- BankSurplus + ApplyBanked: two use-cases with 13 combined tests generated in a single pass — agent correctly inferred guard-clause ordering (input validation → existence check → business rule) and greedy smallest-first application strategy

### Where manual intervention was needed
- Agent outputs were reviewed for correctness against the assignment spec
- Documentation required domain-specific knowledge (FuelEU regulation references, formula accuracy)
- Verified union type values (`VesselType`, `FuelType`) match the exact strings used in seed data
- Confirmed `RouteComparison` is a computed type (not persisted) — agent correctly kept it separate from the DB-aligned `Route` entity
- Verified CB formula constants match the assignment spec (TARGET = 89.3368, MJ_PER_TONNE = 41,000)
- Hand-calculated both test expectations to confirm math correctness
- Reviewed BankSurplus error messages for clarity — each message includes actual vs requested values for debugging
- Verified ApplyBanked smallest-first sort via `toHaveBeenNthCalledWith` call-order assertions in tests

### How tools were combined
- Claude Code handled the full flow: reading the assignment, scaffolding, code generation, git operations
- Parallel file creation was used to speed up multi-file scaffolding

## Best Practices Followed

- Used Claude Code's multi-tool parallelism for independent file operations
- Reviewed all generated configs against official documentation
- Kept generated code minimal — placeholder files with guidance comments rather than speculative implementations
- Incremental commits to show progressive development history
