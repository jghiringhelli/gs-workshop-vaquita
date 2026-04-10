# Functional Tests — Phase 1: Base Infrastructure

## Prerequisites

- Node.js installed
- Dependencies installed (`npm install`)
- Two terminals open

---

## 1. Server startup

**Terminal 1 — start the server:**
```bash
npm run dev
```

**Expected result:**
```
Tanda API running on http://localhost:3000
```

If the server doesn't start, check that port 3000 is free:
```bash
# Windows
netstat -ano | findstr :3000
```

---

## 2. Verify the server responds

```bash
curl -s http://localhost:3000
```

**Expected result:** any HTTP response (even 404), confirming Express is running.

---

## 3. Non-existent route handling (404)

```bash
curl -s -o - -w "\nHTTP Status: %{http_code}\n" http://localhost:3000/non-existent-route
```

**Expected result:**
```
HTTP Status: 404
```

---

## 4. Global error handling (errorHandler middleware)

The `errorHandler` middleware maps `AppError` → JSON with `{ error: "..." }` and the correct `statusCode`. It will be fully verified when services are implemented (Phase 3), but the structure is already active.

---

## 5. Environment variables (config)

### 5.1 Custom port

**Terminal 1 — stop the server (Ctrl+C) and relaunch with a different port:**
```bash
PORT=4000 npm run dev
# Windows PowerShell:
$env:PORT="4000"; npm run dev
```

**Expected result:**
```
Tanda API running on http://localhost:4000
```

```bash
curl -s -o - -w "\nHTTP Status: %{http_code}\n" http://localhost:4000
```

### 5.2 Max participants and penalty (visual validation)

These constants are read from env vars. Default values:

| Variable | Default | Description |
|---|---|---|
| `MAX_PARTICIPANTS` | `20` | Maximum members per tanda |
| `PENALTY_PCT` | `0.05` | 5% penalty for late payments |
| `JWT_SECRET` | `dev-secret-change-me` | JWT secret (change in production) |
| `DB_PATH` | `tanda.db` | SQLite database file path (prod) |

To verify they are read correctly:
```bash
MAX_PARTICIPANTS=5 PENALTY_PCT=0.10 npm run dev
# Windows PowerShell:
$env:MAX_PARTICIPANTS="5"; $env:PENALTY_PCT="0.10"; npm run dev
```

---

## 6. SQLite Database

### 6.1 Verify file creation (production mode)

When starting the server in non-test mode, `tanda.db` is created in the project root:

```bash
# After npm run dev (without NODE_ENV=test):
ls tanda.db
# or in PowerShell:
Test-Path tanda.db
```

**Expected result:** `True` / file visible.

### 6.2 Verify schema created

```bash
# Requires sqlite3 CLI installed
sqlite3 tanda.db ".tables"
```

**Expected result:**
```
contributions  participants  tandas  users
```

```bash
sqlite3 tanda.db ".schema users"
```

**Expected result:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 6.3 Verify in-memory mode for tests

```bash
NODE_ENV=test npm run dev
```

The `tanda.db` file should not be created or modified. Each restart with `NODE_ENV=test` starts with an empty database.

---

## 7. TypeScript type checking

```bash
npm run typecheck
```

**Expected result:** no output (zero errors).

---

## 8. Cleanup

Stop the server with `Ctrl+C` in Terminal 1.

Optional — delete the test database:
```bash
# PowerShell
Remove-Item tanda.db -ErrorAction SilentlyContinue
```

---

## Summary Checklist

- [ ] `npm run dev` starts without errors
- [ ] Server responds at `http://localhost:3000`
- [ ] Port configurable via `PORT` env var
- [ ] `tanda.db` is created with 4 tables in production mode
- [ ] `NODE_ENV=test` uses in-memory database (no file)
- [ ] `npm run typecheck` → 0 errors
