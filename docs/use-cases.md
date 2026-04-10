# Use Cases — Tanda / Vaquita API

## UC-001: Organizer creates and starts a tanda

**Actor**: Tanda organizer
**Precondition**: Organizer has a user account.
**Steps**:
1. Organizer creates a tanda with name, contribution amount, and their user ID.
2. System creates the tanda in FORMING status and auto-joins the organizer as first participant.
3. Other members join via `POST /api/tandas/:id/join`.
4. Once ≥ 3 participants have joined, organizer calls `POST /api/tandas/:id/start`.
5. System randomizes rotation order and transitions tanda to ACTIVE.
**Outcome**: Tanda is active, rotation order is fixed and visible to all participants.
**Error paths**: `400` if fewer than 3 participants; `403` if caller is not organizer.

## UC-002: Member records a contribution

**Actor**: Tanda member
**Precondition**: Tanda is ACTIVE, it is the member's round to contribute.
**Steps**:
1. Member calls `POST /api/tandas/:id/contributions` with their participant ID and amount.
2. System validates the amount matches the tanda's contribution amount.
3. System records the contribution as `paid` for the current round.
4. If late (outside window), system applies 5% penalty and marks as `late`.
**Outcome**: Contribution recorded, member's history updated.
**Error paths**: `400` if wrong amount; `409` if already contributed this round; `422` if tanda not ACTIVE.

## UC-003: Organizer advances round and tanda auto-completes

**Actor**: Tanda organizer
**Precondition**: All contributions for current round are recorded (or missed).
**Steps**:
1. Organizer calls `POST /api/tandas/:id/advance`.
2. System records any missing contributions as `missed`, flags members with 2+ consecutive misses.
3. System increments `currentRound` and updates the pot recipient.
4. If this was the last round, system transitions tanda to COMPLETED.
**Outcome**: Round advanced; if final round, tanda completed.
**Error paths**: `403` if caller is not organizer; `409` if tanda is already COMPLETED or CANCELLED.
