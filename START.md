# Workshop — Vaquita Group A (Free Prompting)
**Mode:** No tooling constraints. Prompt however feels natural.

## Setup (do this first)

The facilitator will give you your participant number (e.g. **P007**).

```bash
git clone https://github.com/pragma-works/gs-workshop-vaquita
cd gs-workshop-vaquita
git checkout condition-a
git checkout -b participant/P007    # replace P007 with your number
npm install
npm test        # confirm baseline passes before you start
```

When you are ready to run the server:
```bash
npm run dev     # starts on http://localhost:3000 — leave this running in a separate terminal
```

> **Note:** `npm run dev` starts a file-watching server and does not return to the prompt. Open a second terminal for everything else.

## The Task
You are building a Tanda/Vaquita API — a rotating savings group system where:
- Users form groups and contribute a fixed amount each cycle
- One member receives the collected pot each cycle (rotation order is set at group creation)
- Members can record payments; the system tracks who has paid each cycle

The spec is in `docs/spec.md`. Start there before writing any code.

## Your Goal
Build the Vaquita REST API from the spec in `docs/spec.md`.

## Success Criteria (8 pts automated + 6 pts hidden live tests = 14 pts total)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass: correct HTTP status codes, response shapes *(hidden live test)* |
| **Composable** | 3 | HTTP layer translates only — business logic never leaks into routes *(hidden live test)* |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `db.prepare / db.run / db.get / db.all` calls in route files — persistence behind a repository layer |
| **Auditable** | 2 | ≥50% conventional commits (1pt) + at least one ADR or decision doc (1pt) |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors — type contracts intact |
| **Total** | **14** | 8 pts automated on push · 6 pts revealed after submission |
## How to Work
- Use your AI assistant however you want (no rules)
- `PROMPT_CARDS.md` has a suggested prompt breakdown — use it or ignore it
- **Commit after each meaningful step** — after setup, after each endpoint works, when you fix a bug. Aim for at least one commit every 15–20 minutes.
- Create `OBSERVATIONS.md` and jot notes as you go

## What to Observe (write notes in OBSERVATIONS.md as you go)

**Process:**
- [ ] How many prompts did it take to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt more than once?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Did the AI fix problems you didn't mention?
- [ ] Are there direct db.prepare / db.run calls in your new route files?
- [ ] Does the response include any fields that shouldn't be exposed?

**Automation:**
- [ ] What required manual intervention that you expected to be automatic?
- [ ] What surprised you (positively or negatively)?

## Before You Finish

Run these checks:
```bash
npm test              # All tests should pass
npm run typecheck     # Should compile clean (no TypeScript errors)
```

Check manually:
- Open your new route file. Is there any db.prepare / db.run / db.get in it? (Should be 0)
- Run `git log --oneline -10`. Are ≥50% of your commits prefixed with feat:/fix:/chore:?
- Does your README describe the feature you built?

Commit and push your work:
```bash
git add -A
git commit -m "obs: session observations and notes"
git push origin participant/P007    # replace P007 with your number
```

Then let the facilitator know you've pushed — the score will update automatically.
