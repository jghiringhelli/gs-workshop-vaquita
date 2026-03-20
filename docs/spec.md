# Vaquita — Group Savings Pool

## Problem

In Mexico and Latin America, informal savings circles (vaquitas, tandas, vacas) are common:
a group of people pool money toward a shared goal — a trip, a gift, a repair, a purchase.
One person holds the money. The money disappears.

There is no accountability. No visibility. No enforcement. Trust alone does not scale.

## What This App Does

Vaquita is a transparent group savings pool API. A group creates a pool with a named
purpose and a target amount. Members contribute. The holder cannot spend the money on
anything other than the stated purpose — every withdrawal requires a reason, a receipt
URL, and approval from a quorum of members.

The pool is done when the target is reached. The final state (purpose met / dissolved /
abandoned) is recorded and visible forever.

## Domain Model

**Pool** — the savings group
- `id`, `name`, `purpose` (what the money is for, immutable after creation)
- `targetAmount` (in cents), `currency` (default: MXN)
- `status`: `open` | `funded` | `closed` | `dissolved`
- `createdBy` (the organiser), `createdAt`

**Member** — a user's participation in a pool
- `userId`, `poolId`, `role`: `organiser` | `member`
- `joinedAt`

**Contribution** — money added to the pool
- `id`, `poolId`, `userId`, `amountCents`, `note` (optional), `createdAt`
- Contributions are immutable once recorded

**Withdrawal** — money taken out
- `id`, `poolId`, `requestedBy`, `amountCents`
- `reason` (required — what the money pays for)
- `receiptUrl` (required — photo/link of proof, must be submitted before approval)
- `status`: `pending` | `approved` | `rejected`
- `approvedCount`, `rejectedCount`
- `resolvedAt`

**Vote** — a member's approval or rejection of a withdrawal
- `id`, `withdrawalId`, `userId`, `vote`: `approve` | `reject`, `createdAt`
- One vote per member per withdrawal

**User**
- `id`, `email`, `username`, `passwordHash`

## Business Rules

1. Only the organiser can invite members or request withdrawals.
2. A withdrawal is approved when `⌈members / 2⌉` members vote `approve` (simple majority).
3. A withdrawal is rejected when `⌊members / 2⌋ + 1` members vote `reject`.
4. `receiptUrl` must be present before any vote can be cast.
5. A member cannot vote on their own withdrawal request.
6. Contributions can only be made to `open` pools.
7. When `totalContributions ≥ targetAmount`, the pool status automatically becomes `funded`.
8. A `funded` pool can have withdrawals approved. A `closed` pool cannot.
9. The organiser can dissolve a pool at any time — status becomes `dissolved`, no further
   contributions or withdrawals are possible.
10. All monetary amounts are stored and returned in **cents** (integers). Display conversion
    is the client's responsibility.

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/register` | `{ email, username, password }` |
| POST | `/users/login` | `{ email, password }` → `{ token }` |

### Pools
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pools` | ✓ | Create a pool `{ name, purpose, targetAmount, currency? }` |
| GET | `/pools/:id` | ✓ | Pool detail + members + contribution total |
| GET | `/pools/:id/ledger` | ✓ (member) | Full contribution + withdrawal history |
| POST | `/pools/:id/invite` | ✓ (organiser) | `{ userId }` — add a member |
| POST | `/pools/:id/dissolve` | ✓ (organiser) | Dissolve the pool |
| GET | `/pools/:id/balance` | ✓ (member) | Live balance: contributions minus approved withdrawals |

### Contributions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pools/:id/contributions` | ✓ (member) | `{ amountCents, note? }` |

### Withdrawals
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pools/:id/withdrawals` | ✓ (organiser) | `{ amountCents, reason, receiptUrl }` |
| GET | `/pools/:id/withdrawals` | ✓ (member) | List withdrawals with vote counts |
| POST | `/withdrawals/:id/vote` | ✓ (member) | `{ vote: "approve" \| "reject" }` |

### Testing
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pools/:id/preview` | — | Pool summary without auth (for demo/testing) |

## Non-Functional Requirements

- **No money disappears**: every cent in must be accounted for. `totalContributions - totalApprovedWithdrawals` must always equal the available balance.
- **Atomicity**: when a vote tips a withdrawal to approved, the status update and `resolvedAt` must be set in the same transaction.
- **Audit trail**: the ledger endpoint returns contributions and withdrawals interleaved, ordered by `createdAt`. Nothing is deletable.
- **Layer separation**: route handlers must not contain SQL or ORM calls directly. All data access goes through a service or repository layer.
- **Tests**: every endpoint must have at least one happy-path and one sad-path test.

## Tech Stack

- Node.js + TypeScript
- Express (or Hono)
- Prisma + SQLite (for portability during the workshop)
- Jest or Vitest for tests
- JWT for auth (secret from env var — never hardcoded)

## Acceptance Check

```bash
# 1. Register and login
TOKEN=$(curl -s -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' \
  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

# 2. Create a pool
POOL=$(curl -s -X POST http://localhost:3000/pools \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cumpleaños de Juan","purpose":"Fiesta de cumpleaños para Juan","targetAmount":500000}')
POOL_ID=$(echo $POOL | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")

# 3. Contribute
curl -s -X POST http://localhost:3000/pools/$POOL_ID/contributions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":100000,"note":"Mi parte"}'

# 4. Check balance
curl -s http://localhost:3000/pools/$POOL_ID/preview
```

All steps should complete without errors.
