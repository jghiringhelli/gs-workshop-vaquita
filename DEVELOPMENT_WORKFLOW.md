# Development Workflow Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and set JWT_SECRET

# 3. Start development server
npm run dev

# 4. In another terminal, run tests
npm test

# 5. Test the API
curl http://localhost:3000/health
```

## Development Commands

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start

# Type checking only (no build)
npm run typecheck
```

### Testing

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run acceptance tests
npx tsx scripts/acceptance-test.ts
npx tsx scripts/spec-acceptance.ts
```

### Code Quality

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Run all quality checks
npm run typecheck && npm test && npm run lint
```

### Utility Scripts

```bash
# Verify setup is complete
npx tsx scripts/verify-setup.ts

# Test database connection and app startup
npx tsx scripts/test-startup.ts

# Run spec acceptance tests
npx tsx scripts/spec-acceptance.ts
```

## Development Workflow

### 1. Starting a New Feature

```bash
# Make sure you're on the right branch
git checkout participant/P049

# Pull latest changes
git pull

# Start dev server
npm run dev
```

### 2. Making Changes

1. **Edit code** in your IDE (VS Code, etc.)
2. **Hot reload** automatically restarts the server
3. **Test manually** with curl or Postman
4. **Write tests** for your changes
5. **Run tests** to ensure nothing breaks

### 3. Testing Your Changes

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### 4. Before Committing

```bash
# Run all checks
npm run typecheck && npm test

# If everything passes, commit
git add .
git commit -m "feat: your feature description"
```

## API Testing Workflow

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","name":"Alice"}'

# Get all users
curl http://localhost:3000/api/users

# Create a tanda
curl -X POST http://localhost:3000/api/tandas \
  -H "Content-Type: application/json" \
  -d '{"name":"Tanda Enero","organizerId":1,"contributionAmount":1000}'

# List user's tandas
curl "http://localhost:3000/api/tandas?userId=1"
```

### Using PowerShell (Windows)

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3000/health"

# Create a user
$user = @{
    email = "alice@example.com"
    name = "Alice"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
  -Method POST `
  -ContentType "application/json" `
  -Body $user

# Create a tanda
$tanda = @{
    name = "Tanda Enero"
    organizerId = 1
    contributionAmount = 1000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/tandas" `
  -Method POST `
  -ContentType "application/json" `
  -Body $tanda
```

### Using the Test Scripts

```bash
# Run full acceptance test
npx tsx scripts/spec-acceptance.ts

# Run vertical slice test
npx tsx scripts/acceptance-test.ts
```

## Debugging

### Enable Debug Logging

Add to your `.env`:
```
NODE_ENV=development
DEBUG=*
```

### Using VS Code Debugger

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["-r", "tsx"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

**Issue: Port already in use**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Issue: Database locked**
```bash
# Stop all Node processes
taskkill /IM node.exe /F

# Remove database lock files
Remove-Item data\*.db-wal, data\*.db-shm
```

**Issue: TypeScript errors**
```bash
# Clean and rebuild
npm run typecheck
```

## File Watching

The dev server uses `tsx watch` which automatically:
- Detects file changes
- Recompiles TypeScript
- Restarts the server
- Preserves database (no reset on restart)

Files watched:
- `src/**/*.ts`
- Database schema changes require manual restart

## Database Management

### Reset Database

```bash
# Remove database files
Remove-Item data\tanda.db*

# Restart server (recreates database)
npm run dev
```

### View Database

```bash
# Install SQLite browser (optional)
# Or use command line

sqlite3 data/tanda.db "SELECT * FROM users;"
```

## Performance Monitoring

### Simple Timing

Add to your code:
```typescript
console.time('operation');
// ... your code ...
console.timeEnd('operation');
```

### Memory Usage

```typescript
console.log(process.memoryUsage());
```

## Continuous Integration

If you set up CI/CD, typical workflow:

```yaml
# .github/workflows/test.yml
- run: npm install
- run: npm run typecheck
- run: npm test
- run: npm run lint
```

## Production Checklist

Before deploying:
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] Logs configured
- [ ] Error tracking set up
- [ ] Health check endpoint works
- [ ] Documentation up to date

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm test` | Run all tests |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npx tsx scripts/spec-acceptance.ts` | Run acceptance tests |

---

**Happy coding!** 🚀

For more details, see:
- `QUICK_REF.md` - Quick reference
- `PROJECT_SETUP.md` - Setup guide
- `COMPLETE_SUMMARY.md` - Full documentation
