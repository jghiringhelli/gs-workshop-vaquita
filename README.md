# 🫰 Tanda API — Workshop

This repository now contains a working REST API for managing **tandas / vaquitas** with Express, TypeScript, and SQLite.

The implementation follows the workshop spec in [`docs/spec.md`](docs/spec.md): users can be created, tandas can be formed and started, participants can join, contributions are tracked per round, organizers can advance the cycle, and tandas auto-complete after the last round.

## What was built

- **Users**: create, list, and fetch by ID
- **Tandas**: create, list by user, detail, join, start, cancel, and participant listing
- **Rounds and contributions**: record contributions, detect late payments with a configurable 5% penalty, summarize a round, advance rounds, track missed payments, and flag defaulters after 2 consecutive misses
- **Lifecycle support**: organizer auto-join, minimum 3 participants to start, configurable max participants, randomized rotation locked at start, auto-completion after the final round
- **Extra feature outside the spec**: preview the current next recipient with `GET /api/tandas/:id/next-recipient`

## API surface

The main contract is available at `/api/...` to match the workshop spec. The same routes are also mounted at `/api/v1/...` so the implementation stays compatible with the internal API standards.

| Method | Path |
|--------|------|
| `GET` | `/health` |
| `POST` | `/api/users` |
| `GET` | `/api/users` |
| `GET` | `/api/users/:id` |
| `POST` | `/api/tandas` |
| `GET` | `/api/tandas?userId=...` |
| `GET` | `/api/tandas/:id` |
| `POST` | `/api/tandas/:id/join` |
| `POST` | `/api/tandas/:id/start` |
| `POST` | `/api/tandas/:id/cancel` |
| `GET` | `/api/tandas/:id/participants` |
| `GET` | `/api/tandas/:id/next-recipient` |
| `POST` | `/api/tandas/:id/contributions` |
| `GET` | `/api/tandas/:id/rounds/:round` |
| `POST` | `/api/tandas/:id/advance` |
| `GET` | `/api/tandas/:id/participants/:pid/history` |

## Architecture

The code is split by feature and keeps the route layer thin:

- `src/features/*/api`: Express routers + Zod validation
- `src/features/*/application`: business logic and workflow orchestration
- `src/features/*/domain`: models, rules, and repository contracts
- `src/features/*/infrastructure`: SQLite repository implementations
- `src/infrastructure/database`: connection bootstrap and schema initialization

Route handlers do not call SQLite directly; repositories own persistence and services enforce business rules.

## Money and configuration choices

- Monetary values are stored as **integer minor units** to avoid floating-point errors.
- SQLite schema is initialized automatically on startup; local development uses `DATABASE_URL=file:./dev.db`.
- `MAX_PARTICIPANTS`, `MIN_PARTICIPANTS_TO_START`, `LATE_PENALTY_BASIS_POINTS`, and `CONTRIBUTION_WINDOW_DAYS` are configurable through environment variables.
- `JWT_SECRET` remains environment-managed for future auth work, but the public workshop spec does not define auth endpoints, so this API currently focuses on the documented tanda flows.

## Run it

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000`.

Useful commands:

```bash
npm test
npm run test:coverage
npm run lint
npm run typecheck
npm run build
```

## Notes for the workshop

- Read `START.md` for the course instructions and scoring rubric.
- Read `INTAKE.md` before your first commit if you are participating in the experiment.
- The scoring workflow still writes `score.json` on pushes to `participant/**`.
