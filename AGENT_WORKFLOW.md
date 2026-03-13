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

## Observations

### Where the agent saved time
- Project scaffolding (folder structure, configs, boilerplate) completed in under 2 minutes
- TypeScript strict config with all recommended flags generated correctly first try
- ESLint flat-config format (eslint.config.mjs) with typescript-eslint v8 — avoids common setup mistakes
- Domain modeling from spec + migrations: agent read all 5 SQL migration files in parallel, then generated aligned TypeScript interfaces in a single pass — no manual cross-referencing needed
- Port interfaces generated with correct generics (`Omit<ComplianceBalance, 'id'>`) and filter types on first attempt

### Where manual intervention was needed
- Agent outputs were reviewed for correctness against the assignment spec
- Documentation required domain-specific knowledge (FuelEU regulation references, formula accuracy)
- Verified union type values (`VesselType`, `FuelType`) match the exact strings used in seed data
- Confirmed `RouteComparison` is a computed type (not persisted) — agent correctly kept it separate from the DB-aligned `Route` entity

### How tools were combined
- Claude Code handled the full flow: reading the assignment, scaffolding, code generation, git operations
- Parallel file creation was used to speed up multi-file scaffolding

## Best Practices Followed

- Used Claude Code's multi-tool parallelism for independent file operations
- Reviewed all generated configs against official documentation
- Kept generated code minimal — placeholder files with guidance comments rather than speculative implementations
- Incremental commits to show progressive development history
