# Session Observations — Participant P025

## What worked well?

AI-driven full implementation with layered architecture was fast — foundation to working API in under 20 minutes. The iterative approach to coverage (92% -> 95% -> 98% -> 100%) and duplication (6.4% -> 3.9% -> 0%) worked well when pushing back on "it's not possible" claims.

## What slowed you down?

Discovering mid-session that the branch should be based on condition-a, not master. Required cherry-picking all work onto a new branch and resolving merge conflicts. Also, the decision log filename had to match a specific regex (`design-notes` works, `decisions` doesn't) which cost a debug cycle.

## How did you handle git commits today?

Mixed — told the AI to handle commits with conventional prefixes. Reorganized history once when rebasing to condition-a (split one big temp commit into 7 meaningful conventional commits).

## Anything surprising?

The AI repeatedly said certain coverage lines were "unreachable" or duplication was "inevitable" — every single time it was wrong and we found a way. Key techniques: `vi.resetModules()` for module-level state, `vi.spyOn` to force errors in catch blocks, direct service calls to bypass Zod validation, and granular test helpers to eliminate duplication.

---

## Process

- [x] How many prompts to reach a working endpoint? ~3 prompts: one for analysis/plan, one to implement all layers, one to wire and test. First working endpoint in under 10 minutes.
- [x] What fraction of your time was prompting vs manually fixing? ~85% prompting, ~15% reviewing, course-correcting, and pushing the AI to do better (especially on coverage and duplication).
- [x] Did you need to repeat or rephrase any prompt? Yes — had to challenge the AI multiple times when it claimed metrics couldn't be improved. Each time it found a solution when pushed.

## Quality

- [x] Did the AI introduce anti-patterns you didn't ask for? One: it initially put a direct `db.prepare` call inside a service file (tanda.service.ts) instead of routing through the repository. It caught and fixed this itself before commit.
- [x] Are there direct `db.*` calls in your new route files? No — verified with grep and scoring script. All DB access goes through the repository layer. Score: bounded 2/2.

## Surprises

- [x] What required manual intervention that you expected to be automatic? Branch setup (condition-a rebase), and verifying the scoring regex for the decision log filename.
- [x] What surprised you (positively or negatively)? Positively: the AI pre-analyzed the scoring script, Hurl test contracts, and CI workflow to reverse-engineer exact API contracts before writing any code. Negatively: it too quickly accepted limits ("can't reach 100% coverage", "duplication is inevitable in tests") that turned out to be wrong every time.

## Final metrics

- Score: 8/8 automated (14 total pending live tests)
- Tests: 76 passed, 0 failed
- Coverage: 100% lines, 100% functions
- Duplication: 0% (0 clones)
- TypeScript errors: 0
- ESLint errors: 0, warnings: 0
- Conventional commits: 98%
