# Reflection

## What I Learned About AI-Assisted Architecture Generation

Building a full-stack FuelEU Maritime compliance platform with AI agents revealed a clear pattern: **AI excels at structured, pattern-based work but requires human judgment for domain-specific correctness and architectural decisions.**

The hexagonal architecture was an ideal fit for AI-assisted development. Once I established the domain types and port interfaces, the agent could systematically implement each layer — use-cases, routers, adapters, and frontend components — by following the contracts already defined. The architecture itself became a prompt: clear interfaces told the agent exactly what to build and how it should behave.

## Efficiency Gains: ~60–70% Faster on Scaffolding and Boilerplate

The most dramatic time savings came from **project scaffolding**. Setting up a monorepo with strict TypeScript, ESLint flat-config, Jest path aliases, TailwindCSS v4, and hexagonal folder structures across two packages would normally take 30–60 minutes of manual configuration. The agent completed this in under 2 minutes with zero configuration errors.

**Test generation** was equally impactful. Producing 49 tests across 5 suites — with correct `jest.Mocked<>` typing, `toBeCloseTo` for floating-point arithmetic, and `toHaveBeenNthCalledWith` for call-order assertions — would have been tedious to write manually. The agent generated idiomatic patterns on the first pass.

**Frontend components** followed a consistent pattern established by the first tab (RoutesTab). Once that pattern existed, the agent replicated it across Compare, Banking, and Pooling tabs — maintaining consistent state management, error handling, and Tailwind styling without explicit instruction to do so.

## Where Manual Thinking Was Still Essential

**The pooling allocation algorithm** (Article 21) required the most careful human oversight. While the agent produced a correct greedy accumulator-based algorithm, I had to hand-trace the accumulator through multi-ship scenarios (0 → +400K → +500K → +200K → +50K) to verify correctness. Algorithmic reasoning at this level still requires human verification — tests prove specific cases work, but hand-tracing proves the algorithm is correct.

**Regulation-specific semantics** couldn't be delegated to the agent. The CB formula constants (TARGET = 89.3368, MJ_PER_TONNE = 41,000), banking rules (Article 20), and pooling constraints (Article 21) all needed cross-referencing against the EU regulation text. The agent implemented what I specified, but the specification itself required domain knowledge.

**Integration bugs** surfaced only when the full system was wired together. Three bugs caught during integration testing — a banking router 404 mismatch, entry-level vs partial apply semantics, and a Jest config glob matching non-test files — required understanding system-level interactions that the agent couldn't anticipate from isolated unit-level prompts.

## What I'd Do Differently

1. **Write domain types first, then use the agent to implement.** The most productive sessions started with me defining interfaces and the agent implementing against them. Going forward, I would always define the domain model and port contracts manually before asking the agent to generate any implementation code.

2. **Smaller, more focused prompts.** Prompts targeting a single use-case or component produced more accurate results than broad multi-feature requests. The CreatePool prompt (one use-case, one algorithm, one test suite) was cleaner than trying to batch multiple use-cases together.

3. **Cross-reference multiple sources.** The agent performed best when given both the spec and existing code to work from. Having SQL migrations and domain types already in place gave the agent concrete constraints. A single-source prompt leads to assumptions; two sources enable self-verification.

4. **Run integration tests earlier.** I wrote all unit tests first, then integration tests as a separate step. The 3 bugs caught in integration would have been found sooner if I had wired end-to-end tests alongside the first router implementation.

## Conclusion

AI agents are **force multipliers for experienced developers** — they eliminate tedious boilerplate and accelerate pattern-based code, but the developer remains responsible for correctness, architecture, and domain integrity. The estimated 60–70% speedup on scaffolding is real, but the remaining 30–40% — the thinking, verifying, and domain reasoning — is where engineering judgment is irreplaceable.
