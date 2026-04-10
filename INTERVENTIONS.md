# Interventions — Participant P004

## Requested extra feature

Add `GET /api/tandas/:id/next-recipient` outside the original `docs/spec.md` contract.

## What happened

- The feature was implemented as a read-only endpoint that returns:
  - `recipient: null` while a tanda is still `forming`
  - the participant with `rotationPosition === currentRound` once the tanda is `active`
- Existing tests kept passing after the change.

## ForgeCraft / cascade observation

- The repository already contained ForgeCraft-generated context (`CLAUDE.md`, `.claude/`, ADR scaffolding, and ForgeCraft metadata), and the implementation followed that context directly.
- Later in the session, ForgeCraft could be accessed through its CLI package: `npx forgecraft-mcp ...`.
- `npx forgecraft-mcp check-cascade .` passed, and `npx forgecraft-mcp status .` reported **4/4 required cascade steps complete**.
- `npx forgecraft-mcp verify .` ran successfully as a command, but its scoring rubric still failed the project at **8/14**, mainly because it expects per-module tests, a pre-commit hook, a commitlint config, and it did not recognize the service/repository split heuristically.
- After adding the extra feature, **no spec or cascade document was auto-updated by tooling**; there was still no observable automatic cascade refresh from the feature request itself.

## Takeaway

The preloaded repository context was enough to guide the implementation effectively, and ForgeCraft CLI validation could be run afterward, but the session still did not reproduce the exact interactive `setup_project` MCP flow described in the workshop instructions.
