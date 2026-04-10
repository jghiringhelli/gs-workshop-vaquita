# Tanda API - Complete Examples

Complete examples for all API endpoints with requests and responses.

## Quick Start

### 1. Create Users

```bash
# Create user 1 (organizer)
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice"
  }' | jq

# Response:
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "email": "alice@example.com",
  "name": "Alice",
  "createdAt": "2024-01-15T10:30:00Z"
}

# Create user 2
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "name": "Bob"
  }' | jq

# Create user 3
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@example.com",
    "name": "Carlos"
  }' | jq

# Create user 4
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "diana@example.com",
    "name": "Diana"
  }' | jq
```

### 2. List Users

```bash
curl -s http://localhost:3000/api/users | jq

# Response:
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "email": "alice@example.com",
    "name": "Alice",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "email": "bob@example.com",
    "name": "Bob",
    "createdAt": "2024-01-15T10:31:00Z"
  }
]
```

### 3. Get User by ID

```bash
curl -s http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174001 | jq

# Response:
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "email": "alice@example.com",
  "name": "Alice",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### 4. Create Tanda

```bash
# Create tanda (organizer: Alice with ID 123e4567-e89b-12d3-a456-426614174001)
curl -s -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tanda Enero 2024",
    "organizerId": "123e4567-e89b-12d3-a456-426614174001",
    "contributionAmount": 1000
  }' | jq

# Response:
{
  "id": "223e4567-e89b-12d3-a456-426614174001",
  "name": "Tanda Enero 2024",
  "organizerId": "123e4567-e89b-12d3-a456-426614174001",
  "contributionAmount": 1000,
  "status": "forming",
  "currentRound": 0,
  "totalRounds": 1,
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

### 5. Join Tanda

```bash
# Bob joins tanda
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174002"
  }' | jq

# Response:
{
  "id": "323e4567-e89b-12d3-a456-426614174002",
  "userId": "123e4567-e89b-12d3-a456-426614174002",
  "tandaId": "223e4567-e89b-12d3-a456-426614174001",
  "role": "member",
  "rotationPosition": 2,
  "createdAt": "2024-01-15T10:36:00Z"
}

# Carlos joins tanda
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174003"
  }' | jq

# Diana joins tanda
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174004"
  }' | jq
```

### 6. Get Participants

```bash
curl -s http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/participants | jq

# Response:
[
  {
    "id": "423e4567-e89b-12d3-a456-426614174001",
    "userId": "123e4567-e89b-12d3-a456-426614174001",
    "tandaId": "223e4567-e89b-12d3-a456-426614174001",
    "role": "organizer",
    "rotationPosition": 1,
    "createdAt": "2024-01-15T10:35:00Z"
  },
  {
    "id": "423e4567-e89b-12d3-a456-426614174002",
    "userId": "123e4567-e89b-12d3-a456-426614174002",
    "tandaId": "223e4567-e89b-12d3-a456-426614174001",
    "role": "member",
    "rotationPosition": 2,
    "createdAt": "2024-01-15T10:36:00Z"
  }
]
```

### 7. Start Tanda

```bash
# Only organizer (Alice) can start
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/start \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174001" \
  -H "Content-Type: application/json" | jq

# Response:
{
  "id": "223e4567-e89b-12d3-a456-426614174001",
  "name": "Tanda Enero 2024",
  "organizerId": "123e4567-e89b-12d3-a456-426614174001",
  "contributionAmount": 1000,
  "status": "active",
  "currentRound": 1,
  "totalRounds": 4,
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": "2024-01-15T10:37:00Z"
}
```

### 8. Get Tanda Details

```bash
curl -s http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001 | jq

# Response:
{
  "id": "223e4567-e89b-12d3-a456-426614174001",
  "name": "Tanda Enero 2024",
  "organizerId": "123e4567-e89b-12d3-a456-426614174001",
  "contributionAmount": 1000,
  "status": "active",
  "currentRound": 1,
  "totalRounds": 4,
  "createdAt": "2024-01-15T10:35:00Z",
  "updatedAt": "2024-01-15T10:37:00Z"
}
```

### 9. Record Contributions

```bash
# Alice contributes (participant ID from previous call: 423e4567-e89b-12d3-a456-426614174001)
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/contributions \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "423e4567-e89b-12d3-a456-426614174001",
    "amount": 1000
  }' | jq

# Response:
{
  "id": "523e4567-e89b-12d3-a456-426614174001",
  "tandaId": "223e4567-e89b-12d3-a456-426614174001",
  "participantId": "423e4567-e89b-12d3-a456-426614174001",
  "round": 1,
  "amount": 1000,
  "status": "paid",
  "paidAt": "2024-01-15T10:38:00Z",
  "createdAt": "2024-01-15T10:38:00Z"
}

# Bob contributes
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/contributions \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "423e4567-e89b-12d3-a456-426614174002",
    "amount": 1000
  }' | jq

# Carlos contributes
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/contributions \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "423e4567-e89b-12d3-a456-426614174003",
    "amount": 1000
  }' | jq

# Diana contributes
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/contributions \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "423e4567-e89b-12d3-a456-426614174004",
    "amount": 1000
  }' | jq
```

### 10. Get Round Summary

```bash
curl -s http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/rounds/1 | jq

# Response:
{
  "round": 1,
  "tandaId": "223e4567-e89b-12d3-a456-426614174001",
  "contributorCount": 4,
  "totalAmount": 4000,
  "expectedAmount": 4000,
  "contributions": [
    {
      "participantId": "423e4567-e89b-12d3-a456-426614174001",
      "status": "paid",
      "amount": 1000,
      "paidAt": "2024-01-15T10:38:00Z"
    },
    {
      "participantId": "423e4567-e89b-12d3-a456-426614174002",
      "status": "paid",
      "amount": 1000,
      "paidAt": "2024-01-15T10:38:30Z"
    }
  ]
}
```

### 11. Get Participant History

```bash
# Get Alice's contribution history
curl -s http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/participants/423e4567-e89b-12d3-a456-426614174001/history | jq

# Response:
[
  {
    "id": "523e4567-e89b-12d3-a456-426614174001",
    "tandaId": "223e4567-e89b-12d3-a456-426614174001",
    "participantId": "423e4567-e89b-12d3-a456-426614174001",
    "round": 1,
    "amount": 1000,
    "status": "paid",
    "paidAt": "2024-01-15T10:38:00Z",
    "createdAt": "2024-01-15T10:38:00Z"
  }
]
```

### 12. Advance to Next Round

```bash
# Only organizer can advance
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/advance \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174001" \
  -H "Content-Type: application/json" | jq

# Response:
{
  "tanda": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Tanda Enero 2024",
    "organizerId": "123e4567-e89b-12d3-a456-426614174001",
    "contributionAmount": 1000,
    "status": "active",
    "currentRound": 2,
    "totalRounds": 4,
    "createdAt": "2024-01-15T10:35:00Z",
    "updatedAt": "2024-01-15T10:40:00Z"
  },
  "message": "Advanced to round 2"
}
```

### 13. List Tandas for User

```bash
# Get all tandas where Alice is a participant
curl -s "http://localhost:3000/api/tandas?userId=123e4567-e89b-12d3-a456-426614174001" | jq

# Response:
[
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Tanda Enero 2024",
    "organizerId": "123e4567-e89b-12d3-a456-426614174001",
    "contributionAmount": 1000,
    "status": "active",
    "currentRound": 2,
    "totalRounds": 4,
    "createdAt": "2024-01-15T10:35:00Z",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
]
```

### 14. Cancel Tanda

```bash
# Create another tanda to cancel
curl -s -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tanda to Cancel",
    "organizerId": "123e4567-e89b-12d3-a456-426614174001",
    "contributionAmount": 500
  }' | jq

# Store the tanda ID from response: 223e4567-e89b-12d3-a456-426614174002

# Cancel it
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174002/cancel \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174001" \
  -H "Content-Type: application/json" | jq

# Response:
{
  "id": "223e4567-e89b-12d3-a456-426614174002",
  "name": "Tanda to Cancel",
  "organizerId": "123e4567-e89b-12d3-a456-426614174001",
  "contributionAmount": 500,
  "status": "cancelled",
  "currentRound": 0,
  "totalRounds": 1,
  "createdAt": "2024-01-15T10:42:00Z",
  "updatedAt": "2024-01-15T10:43:00Z"
}
```

## Error Examples

### Validation Error (400)

```bash
# Missing required field
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' | jq

# Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "path": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

### Not Found Error (404)

```bash
curl -s http://localhost:3000/api/users/00000000-0000-0000-0000-000000000000 | jq

# Response:
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id 00000000-0000-0000-0000-000000000000 not found"
  }
}
```

### Conflict Error (409)

```bash
# Try to join twice
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174001"
  }' | jq

# Response:
{
  "error": {
    "code": "CONFLICT",
    "message": "User is already a participant in this tanda"
  }
}
```

### Business Rule Error (422)

```bash
# Try to start with < 3 participants
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174003/start \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174001" \
  -H "Content-Type: application/json" | jq

# Response:
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Tanda needs at least 3 participants to start. Current: 1"
  }
}
```

### Forbidden Error (403)

```bash
# Non-organizer tries to start tanda
curl -s -X POST http://localhost:3000/api/tandas/223e4567-e89b-12d3-a456-426614174001/start \
  -H "x-user-id: 123e4567-e89b-12d3-a456-426614174002" \
  -H "Content-Type: application/json" | jq

# Response:
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the organizer can start a tanda"
  }
}
```

## Notes

- Replace all IDs with actual IDs from your requests
- Use `jq` for pretty-printed JSON (install with `brew install jq` or `apt-get install jq`)
- The `x-user-id` header simulates the current user making the request
- All timestamps are in ISO 8601 format
- All amounts are in the smallest currency unit (e.g., cents)
