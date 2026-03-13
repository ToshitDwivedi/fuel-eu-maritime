# Reflection

## Using AI Agents for Full-Stack Development

Working with Claude Code on this project highlighted the strengths and limitations of AI-assisted development in a structured engineering context.

## Efficiency Gains

The most significant time savings came from **project scaffolding**. Setting up a monorepo with strict TypeScript, ESLint flat-config, Jest with path aliases, and a hexagonal folder structure would typically take 30-60 minutes of manual configuration and cross-referencing documentation. The agent completed this in under two minutes with zero configuration errors.

Boilerplate generation — Express app wiring, pg pool setup, migration runners — was another area where the agent excelled. These are well-established patterns where correctness is easily verified and the risk of subtle bugs is low.

## Where Manual Oversight Matters

Domain-specific logic requires careful human review. The FuelEU Maritime compliance formulas (CB calculation, banking rules, pooling constraints) involve regulation-specific semantics that an AI agent may approximate but not guarantee. Every formula and business rule must be validated against the actual regulation text.

Architecture decisions — how to slice domain boundaries, which entities belong in `core/domain` versus value objects, how ports should be defined — benefit from the agent's suggestions but ultimately require engineering judgment.

## What I Would Do Differently

1. **Start with domain modeling first** — Define entities and ports before any infrastructure code; the agent is most useful when it has clear interfaces to implement against.
2. **Write tests alongside domain logic** — Use the agent for test generation immediately after each use-case, not as an afterthought.
3. **Smaller, more focused prompts** — Breaking large requests into targeted prompts (e.g., "implement the CB calculation use-case with these exact formulas") produces more accurate results than broad instructions.

## Conclusion

AI agents are most effective as a **force multiplier for experienced developers** — they eliminate tedious boilerplate and accelerate pattern-based code, but the developer remains responsible for correctness, architecture, and domain integrity.
