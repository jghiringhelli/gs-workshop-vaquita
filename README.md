# 🫰 Tanda API

REST API for managing **tandas / vaquitas** with Express, TypeScript, and SQLite.

The implementation covers the full workshop flow:
- users can be created and queried
- tandas can be created, listed, started, cancelled, and joined
- the organizer is auto-added as the first participant
- rotation is locked on start
- contributions are tracked per round with `paid`, `late`, `pending`, and `missed` states
- the organizer can advance rounds and the tanda auto-completes after the final round
- participants with two consecutive missed contributions are flagged as defaulters

## Tech stack

- **TypeScript**
- **Express**
- **better-sqlite3**
- **Zod**
- **Vitest + supertest**

## Project structure

The API is intentionally layered to keep route handlers thin:

```text
src/
  app.ts
  config/
  db/
  errors/
  http/
  users/
  tandas/
  testing/
```

- **Routes** validate/translate HTTP
- **Services** enforce business rules
- **Repositories** own all SQLite access

## Environment

Use these values as shell environment variables, or copy them from `.env.example` into your local setup:

```bash
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=change-me-to-a-long-random-string
PORT=3000
MAX_PARTICIPANTS=20
LATE_PENALTY_PERCENT=5
```

## Running the API

```bash
npm install
npm run dev
```

Server starts on `http://localhost:3000`.

## Validation

```bash
npm test
npm run typecheck
npm run lint
```

## Implemented endpoints

### Users

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create a user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get user by id |

### Tandas

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/tandas` | Create a tanda and auto-join organizer |
| `GET` | `/api/tandas` | List all tandas or filter by `?userId=` |
| `GET` | `/api/tandas/:id` | Get tanda details |
| `GET` | `/api/tandas/:id/participants` | List participants with defaulter flag |
| `POST` | `/api/tandas/:id/join` | Join a tanda while it is forming |
| `POST` | `/api/tandas/:id/start` | Start a tanda (organizer only) |
| `POST` | `/api/tandas/:id/cancel` | Cancel a tanda (organizer only) |
| `POST` | `/api/tandas/:id/contributions` | Record the current-round contribution |
| `GET` | `/api/tandas/:id/rounds/:round` | Get round summary |
| `POST` | `/api/tandas/:id/advance` | Advance to the next round (organizer only) |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Get contribution history for one participant |

## Example flow

```bash
curl -X POST http://localhost:3000/api/users ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"alice@example.com\",\"name\":\"Alice\"}"

curl -X POST http://localhost:3000/api/tandas ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Tanda Enero\",\"organizerId\":1,\"contributionAmount\":1000}"

curl -X POST http://localhost:3000/api/tandas/1/start ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":1}"
```

## Notes

- Organizer-only actions currently identify the actor through the request body (`userId` or `organizerId`) because the workshop contract does not include login/auth endpoints yet.
- The app is bootstrapped through `createApp()` so it can be imported cleanly in tests without binding a port.
