# 🫰 Tanda API

REST API for managing tandas / vaquitas: rotating savings groups where every member
contributes the same amount every round and one member receives the pot each round.

The MVP implements:

- user creation and lookup
- tanda creation, joining, start, cancel, and round advancement
- participant listing and contribution history
- contribution recording with late-penalty handling
- round summaries and automatic completion after the last round

## Architecture

The implementation follows the workshop layering rules:

- routes validate HTTP input and send responses
- services enforce business rules
- repositories own all SQL

No route file talks to the database directly.

## API Base Paths

The same routes are exposed at both:

- `/api/...`
- `/api/v1/...`

Health check:

- `GET /health`

## Auth

`POST /api/users` returns a JWT token signed with `JWT_SECRET`. For workshop compatibility,
the tanda endpoints still accept the explicit actor ids described in `docs/spec.md`. When a
bearer token is present, it must match the actor id supplied in the request.

## Local Run

```bash
npm install
npm run build
npm start
```

Default server URL: `http://localhost:3000`

## Verification

```bash
npm test
npm run test:coverage
npm run typecheck
```

Current automated API coverage is exercised with Vitest + Supertest using endpoint-level
happy-path and 4xx cases named with the
`MethodName_StateUnderTest_ExpectedBehavior` convention.

## Environment

Supported environment variables:

- `PORT`
- `DATABASE_PATH`
- `JWT_SECRET`
- `JWT_TTL_SECONDS`
- `MIN_PARTICIPANTS`
- `MAX_PARTICIPANTS`
- `CONTRIBUTION_WINDOW_HOURS`
- `LATE_PENALTY_BASIS_POINTS`
- `DEFAULT_CURRENCY_CODE`

## Notes

- Monetary values are stored internally in integer minor units
- Organizer is auto-added as the first participant when a tanda is created
- Rotation is randomized and locked when a tanda starts
