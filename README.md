# vaquita — Workshop Project 3 (Greenfield)

A transparent group savings pool API. Build it from the spec.

---

## Your starting point

You have one thing: **[`docs/spec.md`](docs/spec.md)**

It contains the problem, the domain model, all business rules, the full API surface,
and an acceptance check. Everything you build must satisfy it.

---

## Groups

### Group A — Prompt-Only

Use the prompt cards in `PROMPT_CARDS.md`, in order. Wait for each to finish before
sending the next. Log what you changed about each prompt (and why) in `PROMPT_LOG.md`.
Commit after each prompt: `git commit -m "prompt-N: brief description"`.

### Group B — ForgeCraft GS

Before writing any code, run:

```
Use forgecraft to run setup_project for /path/to/this/repo
```

Answer the calibration questions. Then follow the generated session prompt.
You may only intervene if the AI is blocked. Record interventions in `INTERVENTIONS.md`.

---

## Setup (when your code is ready)

```bash
npm install
npm run db:push
npm run dev
```

---

## Scoring (run at end of session)

```bash
# 1. Tests
npm test 2>/dev/null | tail -5

# 2. Layer separation — direct ORM calls in routes (0 = clean)
grep -rn "prisma\." src/routes/ 2>/dev/null | grep -v "//.*prisma" | wc -l

# 3. Feature works
curl -s http://localhost:3000/pools/1/preview

# 4. Business rule: receipt required before vote
# Try to vote without a receiptUrl — should return 4xx
```

Record in the shared sheet: participant ID, group, test count, prisma-in-routes count,
feature working (Y/N), business rules enforced (Y/N), one observation.

---

## What good looks like

- Every business rule in the spec is enforced
- `GET /pools/:id/balance` is always consistent: contributions minus approved withdrawals
- No SQL in route handlers
- JWT secret comes from env var
- Every endpoint has a test
