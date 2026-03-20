# Group A — Prompt Cards

Feed these prompts to your AI **one at a time**, in order.
Wait for each to finish before sending the next.

Before each prompt: decide if you want to change it. **Write what you changed and why** in `PROMPT_LOG.md`. Then send it.

Commit after each prompt: `git commit -m "prompt-N: brief description"`

---

## Prompt 1

```
Read docs/spec.md carefully. Then:
1. Describe the domain model in your own words — what entities exist and how they relate
2. List all the API endpoints that need to be built
3. List the business rules that will need code to enforce (not just data validation)
4. Identify the riskiest parts — where a bug would cause money to disappear or rules to be bypassed

Do not write any code yet. Just analyse.
```

---

## Prompt 2

```
Set up the project skeleton:
- Initialise a TypeScript + Node.js project with Express (or Hono if you prefer) and Prisma
- Write the Prisma schema for all entities in docs/spec.md
- Set up a SQLite database for local development
- Add a .env.example with all required environment variables (JWT secret, database URL)
- Do NOT hardcode any secrets

Run: npx prisma db push
```

---

## Prompt 3

```
Implement user registration and login:
- POST /users/register — { email, username, password }
- POST /users/login — { email, password } → { token }

Requirements:
- Hash passwords (never store plaintext)
- JWT secret must come from an environment variable
- Do not return the password hash in any response
- Write tests for both endpoints — happy path and at least one error case each
```

---

## Prompt 4

```
Implement pools and contributions:
- POST /pools — create a pool { name, purpose, targetAmount, currency? }
- GET /pools/:id — pool detail with members and total contributions
- POST /pools/:id/invite — organiser adds a member { userId }
- POST /pools/:id/contributions — member contributes { amountCents, note? }
- GET /pools/:id/balance — live balance (contributions minus approved withdrawals)
- GET /pools/:id/preview — no-auth summary for testing

Enforce the business rules from docs/spec.md:
- Only open pools accept contributions
- When totalContributions >= targetAmount, status becomes "funded" automatically

Route handlers must not contain direct Prisma calls — use a service or repository layer.
Write at least one test per endpoint.
```

---

## Prompt 5

```
Implement withdrawals and voting:
- POST /pools/:id/withdrawals — organiser requests { amountCents, reason, receiptUrl }
- GET /pools/:id/withdrawals — list withdrawals with vote counts
- POST /withdrawals/:id/vote — member votes { vote: "approve" | "reject" }
- GET /pools/:id/ledger — contributions and withdrawals interleaved, ordered by createdAt

Enforce from docs/spec.md:
- receiptUrl must be present before any vote can be cast
- A member cannot vote on their own withdrawal
- Withdrawal is approved at ceil(members/2) approve votes — set status and resolvedAt in one transaction
- Withdrawal is rejected at floor(members/2)+1 reject votes — same transaction rule
- POST /pools/:id/dissolve — organiser dissolves the pool

Write tests. Run the acceptance check from docs/spec.md when done.
```
