# 🫰 Tanda API — Workshop

Build a REST API for managing **tandas** (rotating savings groups / vaquitas).

Read [`docs/spec.md`](docs/spec.md) first — it has the full domain, business rules, and API surface.

---

## Setup

```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # run tests
```

---

## Which group are you in?

Your facilitator will tell you. Instructions differ — read only your group's section.

---

## Group A — Free Prompting

You have the spec. You have an AI assistant. Build the best version you can.

**No rules on how you prompt.** Use whatever approach feels natural to you.
If you want guidance, `PROMPT_CARDS.md` has a suggested breakdown — use it or ignore it.

One ask: **commit after each meaningful step** so we can see the progression:
```bash
git commit -m "feat: add tanda creation endpoint"
```

At the end, record in the shared sheet: your participant ID, test count, and one observation.

---

## Group B — ForgeCraft GS

Before writing any code, run this in your AI assistant:

```
I have a new project at /path/to/this/repo. Use the forgecraft MCP tool to
run setup_project on it. Answer any questions it asks you.
```

Then follow wherever ForgeCraft leads. Let it drive. Only intervene if the AI is blocked.

**Once the spec is implemented:** try adding one feature that isn't in the spec — just tell
your AI to add it. Watch whether ForgeCraft updates the spec and cascade documents.
Record what happened in `INTERVENTIONS.md`.

At the end, record in the shared sheet: your participant ID, test count, and one observation.

---

## What the metrics workflow measures

On every push, `.github/workflows/experiment-metrics.yml` records automatically:

| Metric | What it captures |
|--------|-----------------|
| TypeScript errors | Type safety |
| Test count | Test coverage investment |
| Line coverage % | Coverage depth |

These appear in the **Actions** tab of your fork after each push. No manual scoring needed.

---

## What good looks like

- Business rules enforced (min 3 participants, rotation locked on start, auto-complete after last round)
- No SQL in route handlers — services and repositories are separate layers
- JWT secret comes from an env var, never hardcoded
- Every endpoint has at least one test
