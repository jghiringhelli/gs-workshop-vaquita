# Architecture Overview

## Summary

This project uses a modular monolith organized by feature, with layered boundaries inspired by Clean Architecture and Hexagonal Architecture.

It is not a full ceremonial Clean Architecture implementation. The goal is pragmatic: preserve testability, maintainability, and separation of concerns without adding unnecessary complexity for workshop scope.

## Architectural Style

The codebase combines these ideas:

- Feature-based modular monolith
- Layered architecture
- Ports and adapters / lightweight hexagonal structure
- Clean Architecture principles applied pragmatically

In practical terms, that means each feature owns its HTTP handlers, application services, repository contracts, repository implementations, schemas, and types, while dependencies still point inward.

## Layers

### 1. HTTP / Delivery Layer

Files such as the route modules are the entry points of the system.

Responsibilities:

- Parse request parameters and bodies
- Validate input with Zod
- Authenticate protected requests through bearer-token middleware
- Call application services
- Translate successful results into HTTP responses
- Delegate failures to centralized error handling

Non-responsibilities:

- No SQL
- No business rules
- No direct lifecycle decisions

Examples:

- `src/features/auth/auth.routes.ts`
- `src/features/users/users.routes.ts`
- `src/features/tandas/tandas.routes.ts`

### 2. Application / Service Layer

Service classes orchestrate use cases and enforce business rules.

Responsibilities:

- Validate domain preconditions
- Enforce authorization rules currently modeled with `organizerId`
- Enforce tanda lifecycle transitions
- Coordinate repository calls
- Keep the domain logic out of HTTP handlers

Examples:

- `src/features/auth/auth.service.ts`
- `src/features/users/users.service.ts`
- `src/features/tandas/tandas.service.ts`

### 3. Persistence / Repository Layer

Repositories are adapters that encapsulate all database access.

Responsibilities:

- Execute SQL against SQLite
- Own transaction boundaries
- Map database rows into application-facing types
- Keep persistence details isolated from the service layer

Examples:

- `src/features/users/users.repository.ts`
- `src/features/tandas/tandas.repository.ts`

### 4. Infrastructure Layer

Infrastructure modules provide technical capabilities used by the rest of the application.

Responsibilities:

- Load and validate runtime config
- Open and configure the SQLite connection
- Initialize schema
- Bootstrap the application composition root

Examples:

- `src/config/env.ts`
- `src/infrastructure/database/sqlite.ts`
- `src/infrastructure/database/schema.ts`
- `src/app.ts`

### 5. Shared Support Layer

Shared cross-cutting concerns are isolated in `lib`.

Responsibilities:

- Typed application errors
- Centralized HTTP error translation
- Audit log persistence for security-sensitive actions

Examples:

- `src/lib/errors.ts`
- `src/lib/http-error-handler.ts`
- `src/lib/audit-log.ts`

## How This Relates to Clean Architecture

This project borrows the parts of Clean Architecture that matter most here:

- business rules are not embedded in controllers
- dependencies point inward
- technical details are kept at the edges
- services depend on repository contracts, not on route handlers

What it does not do is introduce extra abstraction layers purely for theory. For workshop scope, that would slow delivery without materially improving correctness.

## How This Relates to Hexagonal Architecture

The HTTP routes act as driving adapters.
The SQLite repositories act as driven adapters.
The service layer sits in the middle and coordinates use cases.

This is why the system can be described as lightweight hexagonal or ports-and-adapters, even though it remains a single deployable process.

## SOLID Alignment

### Single Responsibility Principle

- Routes handle HTTP concerns.
- Services handle use-case orchestration and business rules.
- Repositories handle persistence.
- Config and DB bootstrapping stay in infrastructure.

### Open/Closed Principle

- Features can grow by adding new service methods and repository queries without rewriting unrelated modules.
- Repositories are hidden behind interfaces, which leaves room for future adapter swaps.

### Liskov Substitution Principle

- Service dependencies are modeled around contracts, especially repository interfaces.
- Concrete SQLite adapters can be replaced as long as they preserve the contract.

### Interface Segregation Principle

- Repository contracts are feature-specific rather than global god-interfaces.
- Users and tandas have separate contracts and responsibilities.

### Dependency Inversion Principle

- The composition root in `src/app.ts` wires concrete implementations.
- Services consume repository interfaces rather than constructing database access directly.

## Design Patterns in Use

### Composition Root

`src/app.ts` builds the dependency graph and wires repositories into services, authentication into middleware, and services into routes.

### Repository Pattern

Persistence is isolated behind feature-specific repository contracts and implementations.

### Thin Controller Pattern

Route handlers are intentionally small and focused on transport concerns.

### Transaction Script at Repository Boundary

Multi-step persistence operations such as create-with-auto-join and start-with-rotation-lock are implemented as SQLite transactions in the repository layer.

### Centralized Error Mapping

Domain and application errors are converted to HTTP responses by one error-handling middleware instead of being repeated in every route.

### Authentication Middleware

Bearer-token verification lives at the route boundary so handlers do not trust client-sent identity fields.

## Main Tradeoffs

### Why this is good for the workshop

- fast to implement
- easy to test end-to-end
- strong separation between transport, rules, and SQL
- good base for future JWT auth and richer contribution policies

### What is intentionally simplified

- auth tokens are issued through a lightweight email-based workshop flow rather than a full password or external identity system
- migration execution is versioned at startup but not yet modeled as fully reversible up/down scripts
- advanced fintech controls such as MFA, double-entry ledgers, and regulatory workflows remain outside workshop scope

Those simplifications are documented in README and Tech Spec so the current implementation is transparent about scope.

## Current Quality Posture

- routes contain no SQL
- business rules are centralized in services
- repository transactions protect multi-step state transitions
- docs and diagrams reflect the current implementation
- lint, typecheck, unit tests, and integration tests pass

## Recommended Next Evolution

If the project continues after the workshop, the next architectural steps should be:

1. add JWT authentication middleware and remove organizer identity from request bodies
2. add rate limiting and stronger credential flows around token issuance
3. evolve the migration runner into explicit reversible migration files
4. consider dedicated domain policy modules if the tanda rules grow substantially