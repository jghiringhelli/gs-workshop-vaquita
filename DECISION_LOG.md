# Decision Log

## Lightweight workshop authentication

### Decision

Use a lightweight JWT flow based on an existing `userId` through `POST /api/auth/token` instead of building full password-based registration and login.

### Why

The workshop spec focuses on tanda lifecycle rules, participant rotation, contributions, penalties, and layered architecture. Adding password storage, hashing, and full account login would have expanded the scope into account management and taken time away from the core business behavior being evaluated.

### Tradeoff

This approach is simpler and faster for the workshop, but it is not a production-grade identity model because anyone who knows a valid `userId` could request a token in this version.
