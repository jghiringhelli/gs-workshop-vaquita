# Tanda API

A REST API for managing **tandas** — rotating savings groups where members contribute a fixed amount each round and receive the pot in turn.

## What's built

14 endpoints across four resources, implemented as vertical slices in strict layered architecture:

```
routes → services → repositories
```

Each layer depends only on **interfaces** (ports), not concrete implementations. Route handlers do nothing but validate input and call the service. All business logic lives in services. SQL stays in repositories.

## Endpoints

**Users**
- `POST /api/users` — create a user
- `GET /api/users` — list all users
- `GET /api/users/:id` — get user by id

**Tandas**
- `POST /api/tandas` — create a tanda (organizer auto-joins as first participant)
- `GET /api/tandas?userId=` — list tandas for a user
- `GET /api/tandas/:id` — get tanda by id
- `POST /api/tandas/:id/start` — start the tanda; randomises rotation, sets totalRounds, requires ≥3 participants
- `POST /api/tandas/:id/cancel` — cancel the tanda (forming or active)
- `POST /api/tandas/:id/advance` — advance to the next round; auto-completes when the last round is passed

**Participants**
- `POST /api/tandas/:id/join` — join a tanda (forming only, no duplicates, max 20)
- `GET /api/tandas/:id/participants` — list participants

**Contributions**
- `POST /api/tandas/:id/contributions` — record a contribution for the current round (active tanda, matching amount, one per participant per round)
- `GET /api/tandas/:id/rounds/:round` — round summary: paid, pending, total collected
- `GET /api/tandas/:id/participants/:pid/history` — full contribution history for a participant

## Running

```bash
npm install
npm run dev   # starts on http://localhost:3000
npm test      # run tests (69 tests, 5 suites)
```

## Design decisions

See [`DECISIONS.md`](DECISIONS.md) for the rationale behind key choices: transaction boundaries, the Fisher-Yates shuffle, the advance + auto-complete atomic write, and more.