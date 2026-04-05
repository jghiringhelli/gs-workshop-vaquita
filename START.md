# Workshop — Vaquita Group B (ForgeCraft GS)
**Mode:** ForgeCraft drives. Let it lead.

## Setup (do this first)

The facilitator will give you your participant number (e.g. **P007**).

```bash
git clone https://github.com/pragma-works/gs-workshop-vaquita
cd gs-workshop-vaquita
git checkout condition-b
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
Build the Vaquita REST API from the spec, guided by the ForgeCraft workflow.

## Success Criteria (8 pts automated + 6 pts hidden live tests = 14 pts total)
- **Verifiable** (2 pts): All tests pass + ≥60% coverage on your new feature files
- **Bounded** (2 pts): Zero direct `db.prepare / db.run / db.get / db.all` calls in new route files
- **Self-describing** (1 pt): README describes what you built
- **Auditable** (1 pt): At least one ADR or decision doc for a meaningful architectural choice
- **Auditable** (1 pt): ≥50% of your commits follow conventional format (`feat:`, `fix:`, `chore:`, etc.)
- **Composable** (3 pts): Clean architecture — no leaking concerns, proper layering *(hidden live test, revealed after submission)*
- **Executable** (3 pts): API behavioral contracts pass — correct status codes, response shapes *(hidden live test, revealed after submission)*

## Step 1 — Add ForgeCraft to your AI assistant
In VS Code with GitHub Copilot, create `.vscode/mcp.json` in this folder:
```json
{
  "servers": {
    "forgecraft": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "forgecraft-mcp@1.4.0"]
    }
  }
}
```
Open Copilot Chat → Agent mode → confirm `forgecraft` appears in tools.

## Step 2 — Run setup
Tell your AI assistant (in Agent mode), replacing the path with wherever you cloned the repo:

```
I have a new project at [path to your cloned repo].
Use the forgecraft MCP tool to run setup_project on it.
Answer any questions it asks you.
```
Follow wherever ForgeCraft leads. Let it drive the whole flow.

## Step 3 — Build the spec
Once setup completes, tell the AI:
```
Read docs/spec.md carefully. Use ForgeCraft check_cascade
to confirm we are ready to build, then implement the spec.
```

## Step 4 — Bonus: add a feature not in the spec
Once the spec is implemented, say:
```
Add a pool leaderboard endpoint — show members ranked by total contributions.
```
Watch whether ForgeCraft updates the spec, emits an ADR, and drives TDD.

## What to Observe (write notes in OBSERVATIONS.md as you go)

**Process:**
- [ ] How many prompts did it take to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt more than once?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Did the AI fix problems you didn't mention?
- [ ] Are there direct `db.prepare` / `db.run` calls in your new route files?
- [ ] Does the response include any fields that shouldn't be exposed?

**ForgeCraft:**
- [ ] Did ForgeCraft correctly infer the project tags (UNIVERSAL, API, FINTECH)?
- [ ] Did `check_cascade` pass cleanly or were there stubs to fill?
- [ ] Did the bonus feature trigger an ADR + spec update automatically?
- [ ] Was the AI instruction file (CLAUDE.md / copilot-instructions) useful or noise?
- [ ] What was confusing about the tools or workflow?

## Before You Finish

Run these checks:
```bash
npm test              # All tests should pass
npm run typecheck     # Should compile clean (no TypeScript errors)
```

Check manually:
- Open your new route file. Is there any `db.prepare` / `db.run` / `db.get` in it? (Should be 0)
- Run `git log --oneline -10`. Are ≥50% of your commits prefixed with `feat:`/`fix:`/`chore:`?
- Does your README describe the feature you built?

Commit and push your work:
```bash
git add -A
git commit -m "obs: session observations and notes"
git push origin participant/P007    # replace P007 with your number
```

Then let the facilitator know you've pushed — the score will update automatically.

