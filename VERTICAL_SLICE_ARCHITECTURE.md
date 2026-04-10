# Vertical Slice Architecture - "Create User" Flow

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP Request                             │
│  POST /api/users                                                 │
│  Content-Type: application/json                                  │
│  Body: {"email":"alice@example.com","name":"Alice"}             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: Route Handler (src/routes/userRoutes.ts)             │
│  ────────────────────────────────────────────────────────────  │
│  router.post('/', (req, res, next) => {                        │
│    const validated = createUserSchema.parse(req.body); ◄────┐  │
│    const user = userService.createUser(validated);          │  │
│    res.status(201).json(user);                               │  │
│  })                                                            │  │
└──────────────────────────┬─────────────────────────────────────┘  │
                           │                                         │
                           ▼                                         │
┌─────────────────────────────────────────────────────────────────┐  │
│  LAYER 2: Validation (src/validation/schemas.ts)               │  │
│  ────────────────────────────────────────────────────────────  │  │
│  export const createUserSchema = z.object({                    │  │
│    email: z.string().email('Invalid email format'),           │  │
│    name: z.string().min(1, 'Name is required')                │  │
│  });                                                            │  │
│                                                                  │  │
│  ✓ Validates email format                                      │  │
│  ✓ Validates name is present                                   │  │
│  ✓ Returns ValidationError if fails ───────────────────────────┘  │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: Service (src/services/userService.ts)                │
│  ────────────────────────────────────────────────────────────  │
│  createUser(request: CreateUserRequest): User {                │
│    // Check for duplicate email                                │
│    const existing = userRepository.findByEmail(email);         │
│    if (existing) {                                              │
│      throw ValidationError('User already exists');             │
│    }                                                            │
│                                                                  │
│    // Delegate to repository                                   │
│    return userRepository.create(email, name);                  │
│  }                                                              │
│                                                                  │
│  ✓ Business logic: Check for duplicates                        │
│  ✓ Orchestrates repository calls                               │
│  ✓ No SQL here!                                                 │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: Repository (src/repositories/userRepository.ts)      │
│  ────────────────────────────────────────────────────────────  │
│  create(email: string, name: string): User {                   │
│    const stmt = this.db.prepare(`                              │
│      INSERT INTO users (email, name)                           │
│      VALUES (?, ?)                                             │
│    `);                                                          │
│                                                                  │
│    const result = stmt.run(email, name);                       │
│    return this.findById(result.lastInsertRowid);               │
│  }                                                              │
│                                                                  │
│  ✓ Prepared statements (SQL injection prevention)              │
│  ✓ Returns typed User object                                   │
│  ✓ Maps snake_case to camelCase                                │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: Database (src/db/schema.sql)                         │
│  ────────────────────────────────────────────────────────────  │
│  CREATE TABLE users (                                          │
│    id INTEGER PRIMARY KEY AUTOINCREMENT,                       │
│    email TEXT UNIQUE NOT NULL,                                 │
│    name TEXT NOT NULL,                                         │
│    created_at TEXT DEFAULT (datetime('now'))                   │
│  );                                                             │
│                                                                  │
│  ✓ UNIQUE constraint on email                                  │
│  ✓ NOT NULL constraints                                        │
│  ✓ Auto-increment ID                                           │
│  ✓ Timestamp tracking                                          │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           │  SQL INSERT executes
                           │  Returns new user ID
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Response Flow (Back Up)                    │
│  ────────────────────────────────────────────────────────────  │
│  Database → Repository → Service → Route → HTTP Response       │
│                                                                  │
│  User object:                                                   │
│  {                                                              │
│    id: 1,                                                       │
│    email: "alice@example.com",                                 │
│    name: "Alice",                                              │
│    createdAt: "2026-04-10 18:08:30"                           │
│  }                                                              │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         HTTP Response                            │
│  Status: 201 Created                                             │
│  Content-Type: application/json                                  │
│  Body: {"id":1,"email":"alice@example.com","name":"Alice",...} │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Error occurs in any layer                                      │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Custom Error │
                    │   Classes    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ValidationError   NotFoundError   BusinessRuleError
      (400)             (404)            (422)
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Error Handler Middleware (src/middleware/errorHandler.ts)     │
│  ────────────────────────────────────────────────────────────  │
│  Maps error to HTTP status code                                │
│  Formats error response                                         │
│  Logs error details                                             │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Error Response                              │
│  Status: 400/404/422/500                                         │
│  Body: {"error":"ValidationError","message":"..."}              │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Test Suite (tests/api/users.test.ts)                          │
│  ────────────────────────────────────────────────────────────  │
│  Uses supertest to simulate HTTP requests                       │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Test Database (./data/test-tanda.db)                          │
│  ────────────────────────────────────────────────────────────  │
│  • Isolated database per test                                  │
│  • Cleaned up after each test                                  │
│  • NODE_ENV=test configuration                                 │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Test Execution                                                 │
│  ────────────────────────────────────────────────────────────  │
│  1. beforeEach: Clean database                                 │
│  2. Test: Create app instance                                  │
│  3. Test: Make HTTP request                                    │
│  4. Test: Assert response                                      │
│  5. afterEach: Close database                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Organization

```
src/
├── routes/
│   └── userRoutes.ts         ← Layer 1: HTTP handlers
├── validation/
│   └── schemas.ts            ← Layer 2: Input validation
├── services/
│   └── userService.ts        ← Layer 3: Business logic
├── repositories/
│   └── userRepository.ts     ← Layer 4: Data access
└── db/
    └── schema.sql            ← Layer 5: Database schema
```

## Data Flow Summary

| Layer | Responsibility | No SQL? | No Business Logic? |
|-------|---------------|---------|-------------------|
| Routes | HTTP handling, validation trigger | ✅ | ✅ |
| Validation | Input validation (Zod) | ✅ | ✅ |
| Services | Business rules, orchestration | ✅ | Contains logic |
| Repositories | SQL queries, data mapping | Contains SQL | ✅ |
| Database | Data persistence, constraints | N/A | N/A |

## Key Principles Demonstrated

1. **Separation of Concerns**
   - Each layer has one responsibility
   - No SQL in services or routes
   - No business logic in repositories

2. **Type Safety**
   - TypeScript interfaces for all data
   - Zod schemas for runtime validation
   - Strict typing throughout

3. **Error Handling**
   - Custom error classes
   - Centralized error middleware
   - Proper HTTP status codes

4. **Testability**
   - Each layer can be tested independently
   - Integration tests verify the full flow
   - Isolated test database

5. **Maintainability**
   - Clear layer boundaries
   - Easy to modify one layer without affecting others
   - Well-organized file structure

---

**Result:** A production-quality vertical slice that demonstrates clean architecture, proper separation of concerns, and comprehensive testing.
