# Use Cases — vaquita-B

## UC-001: Create a Tanda and Recruit Members

**Actor**: Organizer (authenticated user)
**Precondition**: Actor has registered and holds a valid JWT.
**Steps**:
1. Organizer calls POST /api/tandas with name, contributionAmount, totalRounds.
2. System creates the tanda in FORMING status and auto-joins the organizer as participant.
3. Organizer shares the tanda id; members call POST /api/tandas/:id/join.
4. When ≥ 3 members are joined, organizer calls POST /api/tandas/:id/start.
5. System randomizes rotation order and transitions status to ACTIVE.
**Outcome**: Tanda is active; all participants have a locked rotation position.

## UC-002: Record Contributions and Advance Rounds

**Actor**: Participant (authenticated user)
**Precondition**: Tanda is ACTIVE and it is the current round.
**Steps**:
1. Participant calls POST /api/tandas/:id/contributions with the contribution amount.
2. System records the contribution as 'paid' (or 'late' if penalty applies).
3. Organizer calls GET /api/tandas/:id/rounds/:round to review the round summary.
4. Organizer calls POST /api/tandas/:id/advance to close the round.
5. System marks any missing contributions as 'missed', updates defaulter flags, increments currentRound.
6. If currentRound > totalRounds, tanda status transitions to COMPLETED automatically.
**Outcome**: Round is closed; the participant at that rotation position has received the pot.

## UC-003: Cancel a Tanda

**Actor**: Organizer (authenticated user)
**Precondition**: Tanda is in FORMING or ACTIVE status.
**Steps**:
1. Organizer calls POST /api/tandas/:id/cancel.
2. System transitions tanda status to CANCELLED.
3. Actor retrieves the tanda via GET /api/tandas/:id to confirm cancellation.
**Outcome**: Tanda is cancelled; no further contributions can be recorded.
