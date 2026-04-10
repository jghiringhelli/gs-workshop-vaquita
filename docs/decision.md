# Design Decisions

Key architectural choices made during the implementation of the Tanda API, with rationale.

---

## 1. `better-sqlite3` instead of Prisma

**Decision:** Use raw `better-sqlite3` with hand-written SQL DDL instead of an ORM (Prisma).

**Rationale:**
The spec explicitly requires `better-sqlite3` ("SQLite via `better-sqlite3` — no database setup needed"). Beyond spec compliance, this choice has real advantages for this domain:

- **No migration files to manage.** Schema is defined once in `db.ts` via `CREATE TABLE IF NOT EXISTS`, so the database bootstraps itself on first run with zero setup.
- **No build step for the DB layer.** Prisma requires running `prisma generate` before the TypeScript compiler can resolve types. `better-sqlite3` types come straight from `@types/better-sqlite3`.
- **Synchronous API simplifies service logic.** `better-sqlite3` is fully synchronous. Business rules that require multiple reads before a write (e.g., checking participant count before starting a tanda) do not need `await` chains or transaction callbacks — they read cleanly with plain `if` statements.
- **Test isolation is trivial.** Passing `:memory:` to the `createDatabase()` factory gives each test a fresh, isolated in-memory DB with zero file I/O.

**Trade-off:** Raw SQL means no type-safe query builder. Mitigated by keeping all SQL inside repository functions (never in services or routes), so any query change is localised to one file.

---

## 2. Dependency injection via factory functions (not singletons)

**Decision:** Every layer (`createDatabase`, `createUserRepository`, `createUserService`, `createApp`) is a factory function that accepts its dependencies as parameters, rather than exporting module-level singletons.

**Rationale:**
The spec requires layer separation and testability. DI via factory functions achieves both:

- **Tests use `:memory:` databases** without monkey-patching module imports or environment variables. Each test file calls `createDatabase(':memory:')` and `createApp(db)` independently — tests cannot interfere with each other.
- **No hidden coupling.** A singleton `db` imported at the top of a service file creates an invisible dependency on the module-load order and the filesystem. A factory parameter makes the dependency explicit and swappable.
- **Easy to extend.** Adding a second database (e.g., read replica) or replacing SQLite with Postgres in the future only requires changing the factory call site — the repositories stay the same.

---

## 3. Email-only JWT login (no passwords)

**Decision:** `POST /api/auth/login` accepts `{ email }` and returns a JWT. There is no password field.

**Rationale:**
The spec's User domain model is `{ id, email, name }` — no `password` field exists. Adding password hashing would require inventing a data model not in the spec and would add `bcrypt` (a native dependency with compilation requirements) without corresponding spec coverage.

The JWT is still meaningfully auth: it proves the caller knows the user's email at login time and signs every subsequent organiser-only action (start, cancel, advance) with the user's ID. For a workshop/demo context this is sufficient; in production the login step would be replaced with an OAuth flow or password + bcrypt without changing any other layer.

---

## 4. `BusinessRuleError` as a distinct error class (422, not 400)

**Decision:** Business rule violations (e.g., "tanda needs at least 3 participants") throw `BusinessRuleError` (HTTP 422), distinct from `ValidationError` (HTTP 400).

**Rationale:**
HTTP 400 means the *request was malformed* — wrong types, missing fields. HTTP 422 means the request was well-formed but could not be processed due to *semantic / domain constraints*. A client that sends `POST /tandas/:id/start` with a perfectly valid body on a tanda with only 2 participants has not made a bad request — they have violated a business rule. Giving clients distinct status codes lets API consumers handle "fix your input" (400) separately from "fix your application state" (422) without parsing error messages.
