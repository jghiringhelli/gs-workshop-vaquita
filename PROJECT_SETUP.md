# Tanda API - Project Structure

## Folder Organization

```
src/
├── config/          # Environment configuration and constants
├── db/              # Database connection and schema
├── errors/          # Custom error hierarchy
├── middleware/      # Express middleware (error handling, auth)
├── models/          # TypeScript types and interfaces
├── repositories/    # Data access layer (SQL queries)
├── services/        # Business logic layer
├── routes/          # API route handlers
└── validation/      # Zod validation schemas

tests/
└── api/             # API integration tests
```

## Layer Separation

1. **Routes** → Call services, validate input, return HTTP responses
2. **Services** → Implement business rules, orchestrate repositories
3. **Repositories** → Execute SQL queries, return domain models
4. **Database** → SQLite connection and schema

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and set JWT_SECRET
```

### Running
```bash
# Development mode with auto-reload
npm run dev

# Build
npm run build

# Production
npm start

# Tests
npm test
npm run test:watch
npm run test:coverage
```

### Testing the API
```bash
# Health check
curl http://localhost:3000/health
```

## Next Steps

Phase 1: ✅ Foundation Complete
- Config & constants
- Custom errors
- Database schema
- Middleware

Phase 2: Data Layer (Next)
- [ ] User repository
- [ ] Tanda repository
- [ ] Participant repository
- [ ] Contribution repository

Phase 3: Business Logic
- [ ] User service
- [ ] Tanda service (business rules)

Phase 4: API Routes
- [ ] User routes
- [ ] Tanda routes

Phase 5: Testing
- [ ] User API tests
- [ ] Tanda API tests
