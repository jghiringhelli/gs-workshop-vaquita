# Approved Packages

| Package | Version range | Purpose | Alternatives rejected | Rationale | Audit status |
|---|---|---|---|---|---|
| express | `^4.21.0` | HTTP routing and middleware | `koa`, `restify` | Matches the project standard, simple routing surface, and broad ecosystem support | `npm audit --audit-level=high`: 0 HIGH/CRITICAL |
| better-sqlite3 | `^11.7.0` | Embedded SQLite persistence | External database setup | Fits the workshop requirement for zero-setup local persistence | `npm audit --audit-level=high`: 0 HIGH/CRITICAL |
| zod | `^3.24.0` | Request validation and typed schemas | Manual validation, `joi` | Native TypeScript-friendly validation at the API boundary | `npm audit --audit-level=high`: 0 HIGH/CRITICAL |
| vitest | `^3.0.0` | Test runner | `mocha`, `jasmine` | Fast TypeScript-native testing with simple integration for coverage | `npm audit --audit-level=high`: 0 HIGH/CRITICAL |
| supertest | `^7.0.0` | HTTP integration testing | Raw `fetch` assertions | Direct subcutaneous testing against the Express app | `npm audit --audit-level=high`: 0 HIGH/CRITICAL |
| typescript | `^5.7.0` | Static type checking | Unchecked JavaScript | Required for strict compile-time safety and project standards | `npm audit --audit-level=high`: 0 HIGH/CRITICAL |

No new dependencies were added during implementation; this file documents the existing project toolchain that the API now depends on.
