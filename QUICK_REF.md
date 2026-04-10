# Quick Reference - Tanda API Development

## Project Status
✅ **Phase 1 Complete** - Foundation & Structure
📝 **Phase 2 Next** - Implement Repositories

## Quick Start

```bash
# Start development server
npm run dev

# Visit health check
curl http://localhost:3000/health

# Run type check
npm run typecheck

# Run tests
npm test
```

## File Locations

### Core Files
- Entry point: `src/index.ts`
- Express app: `src/app.ts`
- Config: `src/config/index.ts`
- Database: `src/db/database.ts`
- Schema: `src/db/schema.sql`

### Code Organization
- Types: `src/models/types.ts`
- Errors: `src/errors/customErrors.ts`
- Validation: `src/validation/schemas.ts`
- Middleware: `src/middleware/errorHandler.ts`

### Next to Implement
- Repositories: `src/repositories/` (empty)
- Services: `src/services/` (empty)
- Routes: `src/routes/` (empty)
- Tests: `tests/api/` (empty)

## Business Rules Constants

From `src/config/index.ts`:
```typescript
MIN_PARTICIPANTS = 3
MAX_PARTICIPANTS = 20
LATE_PENALTY_PERCENT = 5
MAX_CONSECUTIVE_MISSES = 2
```

## Database Tables

1. **users** - User accounts
2. **tandas** - Tanda groups
3. **participants** - User-Tanda relationships
4. **contributions** - Payment records

See full schema: `src/db/schema.sql`

## Custom Errors

All in `src/errors/customErrors.ts`:
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `BusinessRuleError` (422)

## Type Definitions

Main types in `src/models/types.ts`:
```typescript
User, Tanda, Participant, Contribution
TandaStatus, ParticipantRole, ContributionStatus
CreateUserRequest, CreateTandaRequest, etc.
```

## Validation Schemas

All Zod schemas in `src/validation/schemas.ts`:
```typescript
createUserSchema
createTandaSchema
joinTandaSchema
recordContributionSchema
```

## API Endpoints (from spec.md)

### Users
- `POST /api/users` - Create user
- `GET /api/users` - List users  
- `GET /api/users/:id` - Get user

### Tandas
- `POST /api/tandas` - Create tanda
- `GET /api/tandas?userId=` - List user's tandas
- `GET /api/tandas/:id` - Get tanda details
- `POST /api/tandas/:id/join` - Join tanda
- `POST /api/tandas/:id/start` - Start tanda (organizer)
- `POST /api/tandas/:id/cancel` - Cancel tanda (organizer)
- `POST /api/tandas/:id/advance` - Next round (organizer)
- `GET /api/tandas/:id/participants` - List participants
- `POST /api/tandas/:id/contributions` - Record contribution
- `GET /api/tandas/:id/rounds/:round` - Round summary
- `GET /api/tandas/:id/participants/:pid/history` - Contribution history

## Useful Commands

```bash
# Verify setup
npx tsx scripts/verify-setup.ts

# Test startup
npx tsx scripts/test-startup.ts

# Build
npm run build

# Type check only
npm run typecheck

# Tests
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

## Development Flow

1. **Repositories** - Write SQL, return types
2. **Services** - Business rules, call repositories
3. **Routes** - Validate input, call services, return HTTP
4. **Tests** - Test each endpoint (happy + error)

## Environment Variables

In `.env` (copy from `.env.example`):
```
PORT=3000
DATABASE_PATH=./data/tanda.db
JWT_SECRET=your-secret-here-change-in-production
MIN_PARTICIPANTS=3
MAX_PARTICIPANTS=20
LATE_PENALTY_PERCENT=5
MAX_CONSECUTIVE_MISSES=2
```

## Documentation Files

- `docs/spec.md` - Full specification
- `STATUS.md` - Detailed status & next steps
- `PHASE1_COMPLETE.md` - Phase 1 completion report
- `PROJECT_SETUP.md` - Development guide
- `QUICK_REF.md` - This file

---

**Happy coding!** 🚀
