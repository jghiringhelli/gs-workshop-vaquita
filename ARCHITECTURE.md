# Tanda API - Architecture & Design

## Overview

The Tanda API implements a transparent and secure rotating savings group system. This document outlines the architecture, design decisions, and implementation details.

## Architecture Layers

```
┌─────────────────────────────────────┐
│     Express Route Handlers          │ (HTTP requests/responses)
├─────────────────────────────────────┤
│     Services (Business Logic)       │ (Rules, validation, orchestration)
├─────────────────────────────────────┤
│     Repositories (Data Access)      │ (Database operations)
├─────────────────────────────────────┤
│     SQLite Database                 │ (Persistent storage)
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Route Handlers (`src/routes/`)
- **Purpose**: Handle HTTP requests and responses
- **Responsibilities**:
  - Parse and validate input using Zod schemas
  - Delegate to services
  - Format responses
  - Propagate errors to middleware
- **Design Pattern**: Clean separation - routes never contain business logic or SQL
- **Files**:
  - `userRoutes.ts`: User endpoints
  - `tandaRoutes.ts`: Tanda management endpoints
  - `contributionRoutes.ts`: Contribution and round endpoints

#### 2. Services (`src/services/`)
- **Purpose**: Implement all business logic and enforce domain rules
- **Responsibilities**:
  - Validate business constraints before state changes
  - Enforce tanda rules (minimum/maximum participants, status transitions)
  - Orchestrate repository calls
  - Handle calculations (penalty fees, rotations)
- **Design Pattern**: Single responsibility - one service per domain concept
- **Key Services**:
  - `UserService`: User creation and retrieval
  - `TandaService`: Tanda lifecycle (create, join, start, cancel)
  - `ParticipantService`: Participant management
  - `ContributionService`: Contribution recording and round advancement

#### 3. Repositories (`src/repositories/`)
- **Purpose**: Abstract database operations
- **Responsibilities**:
  - CRUD operations
  - Database queries
  - Row-to-entity mapping
- **Design Pattern**: Repository Pattern - clean boundary between domain and persistence
- **Key Repositories**:
  - `UserRepository`
  - `TandaRepository`
  - `ParticipantRepository`
  - `ContributionRepository`

#### 4. Database (`src/database/`)
- **Engine**: SQLite via `better-sqlite3`
- **Storage**: In-memory (`:memory:`) or file-based
- **Performance**: Indexed queries on frequently filtered columns
- **Features**: Foreign key constraints enabled for data integrity

## Design Decisions

### 1. Dependency Injection
All services receive repositories through constructor injection. This enables:
- **Testability**: Mock repositories for unit testing
- **Flexibility**: Easy to swap implementations
- **Clarity**: Dependencies explicitly declared

```typescript
class TandaService {
  constructor(private repositories: Repositories) {}
}
```

### 2. Error Hierarchy
Custom error classes map directly to HTTP status codes:
- `ValidationError` → 400
- `NotFoundError` → 404
- `ConflictError` → 409
- `ForbiddenError` → 403
- `BusinessRuleError` → 422
- `InternalError` → 500

Benefits:
- Type-safe error handling
- Consistent error responses
- Clear HTTP semantics

### 3. Input Validation with Zod
Schema-based validation at route entry points:
- **Early validation**: Prevents invalid data from reaching services
- **Type safety**: Runtime validation with TypeScript inference
- **Clear contracts**: Schema documents API expectations

```typescript
const CreateTandaSchema = z.object({
  name: z.string().min(1).max(200),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().int().positive(),
});
```

### 4. Business Rules Enforcement
All rules implemented at service layer:
- Minimum 3 participants to start a tanda
- Maximum 20 participants per tanda (configurable)
- Rotation randomization on tanda start
- Late contribution penalties (5% by default)
- Status transition validation
- Organizer-only operations

### 5. Configuration Management
Environment-based configuration via `config/index.ts`:
- Magic numbers centralized (min/max participants, penalties)
- Environment variables for deployment-specific settings
- Startup validation to catch configuration errors

```typescript
const config = {
  tanda: {
    minParticipants: 3,
    maxParticipants: parseInt(process.env.MAX_PARTICIPANTS || '20', 10),
    latePenaltyPercent: parseFloat(process.env.LATE_PENALTY_PERCENT || '0.05'),
  },
};
```

### 6. Async Error Handling
Wrapper function catches async errors and forwards to middleware:

```typescript
export function asyncHandler(fn: Function) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### 7. SOLID Principles Application

**Single Responsibility Principle (SRP)**
- Each service handles one domain concept
- Each repository manages one entity
- Each error class represents one error type

**Open/Closed Principle (OCP)**
- Services are open for extension (new business rules) but closed for modification
- Repository interface allows swapping implementations

**Liskov Substitution Principle (LSP)**
- Repository implementations are interchangeable
- All services follow the same interface contract

**Interface Segregation Principle (ISP)**
- Services only depend on specific repository interfaces
- No "god interfaces"

**Dependency Inversion Principle (DIP)**
- High-level modules (services) don't depend on low-level (repositories)
- Both depend on abstractions (interfaces)

## Data Model

### Entities and Relationships

```sql
Users (1) ──────────> (N) Tandas
          organizer         

Users (N) ──────────> (N) Tandas (through Participants)
          participant

Tandas (1) ──────────> (N) Participants
                       many-to-many
Tandas (1) ──────────> (N) Contributions
                       one-to-many
```

### Entity Details

#### User
```typescript
interface User {
  id: string;              // UUID
  email: string;           // Unique
  name: string;
  createdAt: Date;
}
```

#### Tanda
```typescript
interface Tanda {
  id: string;
  name: string;
  organizerId: string;     // Reference to User
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Participant
```typescript
interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: 'organizer' | 'member';
  rotationPosition: number;  // Determines payout order
  createdAt: Date;
}
```

#### Contribution
```typescript
interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  paidAt: Date | null;
  createdAt: Date;
}
```

## Business Rules & Implementation

### Tanda Lifecycle

1. **FORMING** (Initial state)
   - Users can join freely
   - Organizer can cancel
   - Cannot record contributions

2. **ACTIVE** (After start)
   - No new members can join
   - Contributions recorded per round
   - Organizer can advance rounds
   - Members cannot join after start

3. **COMPLETED** (After final round)
   - All members have received payout
   - Cannot record more contributions

4. **CANCELLED**
   - Terminal state
   - Cannot revert

### Key Business Logic

#### Rule 1: Minimum/Maximum Participants
```typescript
if (participantCount < 3) {
  throw new BusinessRuleError('Need at least 3 participants');
}
if (participantCount >= config.tanda.maxParticipants) {
  throw new BusinessRuleError('Exceeded max participants');
}
```

#### Rule 2: Rotation Randomization
When tanda starts, rotation order is shuffled (Fisher-Yates algorithm):
```typescript
private shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

#### Rule 3: Late Contributions
Contributions after round 1 are marked as "late" with penalty:
```typescript
const penalty = Math.floor(amount * config.tanda.latePenaltyPercent);
finalAmount = amount + penalty;
status = 'late';
```

#### Rule 4: Authorization
Only organizer can:
- Start tanda
- Cancel tanda
- Advance rounds

Enforced at service layer:
```typescript
if (tanda.organizerId !== requestingUserId) {
  throw new ForbiddenError('Only organizer can perform this action');
}
```

## API Endpoints Summary

### Users
- `POST /api/users` - Create user
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user details

### Tandas
- `POST /api/tandas` - Create tanda
- `GET /api/tandas` - List tandas (optionally filtered by userId)
- `GET /api/tandas/:id` - Get tanda details
- `POST /api/tandas/:id/join` - Join tanda
- `POST /api/tandas/:id/start` - Start tanda (organizer only)
- `POST /api/tandas/:id/cancel` - Cancel tanda (organizer only)
- `GET /api/tandas/:id/participants` - List participants

### Contributions
- `POST /api/tandas/:id/contributions` - Record contribution
- `GET /api/tandas/:id/rounds/:round` - Get round summary
- `GET /api/tandas/:id/participants/:pid/history` - Get participant history
- `POST /api/tandas/:id/advance` - Advance to next round (organizer only)

## Testing Strategy

### Test Coverage

1. **Happy Path Tests**
   - Standard flow for each endpoint
   - Complete tanda lifecycle (create → join → start → contribute → advance → complete)

2. **Validation Tests**
   - Invalid input formats
   - Missing required fields
   - Duplicate records

3. **Authorization Tests**
   - Non-organizer cannot start/cancel/advance
   - Non-owner cannot join twice

4. **Business Rule Tests**
   - Cannot start with < 3 participants
   - Cannot exceed max participants
   - Cannot join after tanda starts
   - Cannot advance with pending contributions

5. **Edge Cases**
   - Single-member tandas
   - Max participant tandas
   - Round transitions

### Test Framework
- **Framework**: Vitest
- **Integration**: supertest (HTTP client for Express)
- **Database**: In-memory SQLite for test isolation
- **Coverage**: 75%+ of business logic paths

## Performance Considerations

### Database Indexes
Strategic indexes on frequently queried columns:
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tandas_organizer_id ON tandas(organizer_id);
CREATE INDEX idx_tandas_status ON tandas(status);
CREATE INDEX idx_participants_tanda_id ON participants(tanda_id);
CREATE INDEX idx_contributions_tanda_id ON contributions(tanda_id);
CREATE INDEX idx_contributions_round ON contributions(tanda_id, round);
```

### Query Patterns
- Queries filtered by indexes with `WHERE` clauses
- Composite indexes on common filter combinations
- Foreign key constraints to maintain referential integrity

## Security Considerations

### Authentication & Authorization
Current implementation:
- User ID passed via `x-user-id` header
- No cryptographic verification (suitable for workshop)

Production upgrades:
- JWT tokens with secret key
- Session management
- Permission middleware

### Input Validation
- All inputs validated with Zod schemas
- Sanitization at route layer
- SQL injection prevented by prepared statements

### Data Protection
- Sensitive data (email) not logged
- Errors don't leak internal details
- SQLite in-memory suitable for development only

## Assumptions & Design Trade-offs

### Assumptions

1. **User Identification**
   - Users identified by UUID
   - Email is unique and valid
   - No email verification required (workshop assumption)

2. **Contribution Deadline**
   - Simple heuristic: contributions in rounds > 1 are "late"
   - Real system would track explicit deadlines per round

3. **Payout Recipient**
   - Participant who contributed receives pot
   - Determined by rotation position
   - Not modeled explicitly in current database

4. **Late Payment Handling**
   - Tracked but no automatic penalties yet
   - Manual review required in real system

### Trade-offs

1. **In-Memory Database** vs. Persistent Storage
   - ✓ Simple, no setup
   - ✗ Data lost on restart
   - **Solution**: Environment variable to switch to file-based

2. **Simple Penalty Model** vs. Complex Finance Rules
   - ✓ Easy to understand and test
   - ✗ Doesn't handle all real-world scenarios
   - **Solution**: Service layer allows easy extension

3. **No Explicit Auth** vs. Full JWT
   - ✓ Simple for workshop
   - ✗ Not production-ready
   - **Solution**: Header-based user identification with clear upgrade path

## Extension Points

### Adding New Features

**Example: Loan Requests**
1. Create `Loan` entity in types
2. Add `LoanRepository` implementation
3. Create `LoanService` with business logic
4. Add new routes with validation
5. Write tests
6. Update ARCHITECTURE.md

**Example: Payment History**
1. Add audit table to database
2. Create `AuditRepository`
3. Log events in services
4. Create audit endpoints

**Example: Late Payment Penalties**
1. Add penalty calculation to `ContributionService`
2. Store penalty amount in contributions table
3. Add endpoint to retrieve penalty summary

## Running the Application

### Prerequisites
```bash
npm install
```

### Development
```bash
npm run dev
```

### Testing
```bash
npm run test
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Production Build
```bash
npm run build
npm start
```

### Code Quality
```bash
npm run lint
npm run typecheck
```

## Conclusion

This architecture prioritizes:
1. **Clarity** - Clear separation of concerns and responsibilities
2. **Maintainability** - Easy to understand and modify
3. **Scalability** - Clean layers allow independent scaling
4. **Testability** - Dependencies injected for easy testing
5. **Security** - Validation and authorization at every layer

The design follows SOLID principles and established patterns (Repository, Dependency Injection, Factory) making it easy to extend and maintain as requirements evolve.
