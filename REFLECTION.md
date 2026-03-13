# Reflection

## Using AI Agents for Full-Stack Development

Working with Claude Code on this project highlighted the strengths and limitations of AI-assisted development in a structured engineering context.

## Efficiency Gains

The most significant time savings came from **project scaffolding**. Setting up a monorepo with strict TypeScript, ESLint flat-config, Jest with path aliases, and a hexagonal folder structure would typically take 30-60 minutes of manual configuration and cross-referencing documentation. The agent completed this in under two minutes with zero configuration errors.

Boilerplate generation — Express app wiring, pg pool setup, migration runners — was another area where the agent excelled. These are well-established patterns where correctness is easily verified and the risk of subtle bugs is low.

**Domain modeling** was surprisingly effective. By feeding the agent both the assignment spec and the existing SQL migrations, it produced TypeScript interfaces that aligned 1:1 with the database schema while following TypeScript best practices (`readonly` properties, union types for enums, `Omit<>` for auto-generated fields). The agent also correctly identified `RouteComparison` as a computed type that doesn't map to a table — a distinction that requires understanding the difference between persisted entities and derived DTOs.

**Use-case implementation with tests** demonstrated the agent's ability to work within an established architecture. Given the port interfaces and domain types from the previous step, the agent produced a `ComputeCB` use-case with correct constructor injection, accurate formula implementation, and an idiomatic Jest test suite — all passing on the first run. The test mocking patterns (`jest.Mocked<>`, `toBeCloseTo` for floating-point, `expect.closeTo` inside `toHaveBeenCalledWith`) were generated correctly without manual correction, which is notable since testing patterns are a common area where AI agents hallucinate non-existent APIs.

**Multi-use-case generation** scaled well. When asked to produce `BankSurplus` and `ApplyBanked` simultaneously (with 13 combined test cases), the agent maintained consistency across both — identical mock-factory patterns, consistent guard-clause ordering (input validation → existence check → business rule), and correct inter-use-case semantics (BankSurplus saves `applied: false`, ApplyBanked calls `markApplied`). The greedy smallest-first strategy in `ApplyBanked` was accurately implemented and verified with `toHaveBeenNthCalledWith` call-order assertions.

**Algorithm generation** was tested with the `CreatePool` use-case, which required a greedy accumulator-based allocation algorithm with three validation invariants. The agent produced correct allocation logic on the first pass and added defensive post-allocation checks — a pattern that shows the agent can reason about algorithmic correctness beyond simple CRUD. The 8-test suite covered both happy paths and edge cases (empty members, zero-CB ships, partial coverage), all passing without correction.

**HTTP layer wiring** demonstrated the agent's ability to refactor existing infrastructure while maintaining backwards compatibility. When asked to create Express routers, the agent recognized that the existing static `router` and `app` exports needed to become factory functions to support manual dependency injection. It refactored `app.ts` from `export const app` to `export function createApp(repos)` and updated `index.ts` accordingly — all without breaking the existing 24 tests. The factory pattern preserves the hexagonal boundary cleanly: adapters receive port interfaces, never import infrastructure directly.

## Where Manual Oversight Matters

Domain-specific logic requires careful human review. The FuelEU Maritime compliance formulas (CB calculation, banking rules, pooling constraints) involve regulation-specific semantics that an AI agent may approximate but not guarantee. Every formula and business rule must be validated against the actual regulation text.

Architecture decisions — how to slice domain boundaries, which entities belong in `core/domain` versus value objects, how ports should be defined — benefit from the agent's suggestions but ultimately require engineering judgment.

## What I Would Do Differently

1. **Start with domain modeling first** — Define entities and ports before any infrastructure code; the agent is most useful when it has clear interfaces to implement against. This was validated in practice: having the SQL migrations already in place gave the agent concrete schemas to align against, producing accurate types on the first pass.
2. **Write tests alongside domain logic** — Use the agent for test generation immediately after each use-case, not as an afterthought. This was validated with ComputeCB: generating the test in the same prompt as the use-case ensured tight alignment between implementation and test expectations, and caught potential formula errors immediately.
3. **Smaller, more focused prompts** — Breaking large requests into targeted prompts (e.g., "implement the CB calculation use-case with these exact formulas") produces more accurate results than broad instructions.
4. **Cross-reference multiple sources** — The agent performed best when given both the spec and existing code (migrations) to work from. Providing a single source leads to assumptions; providing two sources enables verification.

## Conclusion

AI agents are most effective as a **force multiplier for experienced developers** — they eliminate tedious boilerplate and accelerate pattern-based code, but the developer remains responsible for correctness, architecture, and domain integrity.
