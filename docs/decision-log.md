# Plan de Ejecución — Tanda API (14/14 pts)

### Análisis del Scoring

| Propiedad | Pts | Cómo se evalúa | Qué necesitamos |
|---|---|---|---|
| **Self-describing** | 1 | README.md modificado, >300 chars, diff vs template | Reescribir README describiendo la API |
| **Bounded** | 2 | Cero `db.prepare/exec/run/get/all/transaction` o `new Database(` fuera de `db/`, `database/`, `repositories/`, `repository/` | Toda llamada a SQLite solo en capa `repository/` |
| **Verifiable** | 2 | Tests pasan (1pt) + cobertura ≥60% líneas (1pt) | Tests happy-path + 4xx por endpoint, ≥60% coverage |
| **Defended** | 1 | `.github/workflows/` o `.husky/pre-commit` | Crear CI workflow o husky pre-commit |
| **Auditable** | 2 | ≥50% commits convencionales (1pt) + doc de decisión con nombre tipo `adr/decision/design-log/rationale/choices` (1pt) | Commits `feat:/fix:/chore:` + crear `docs/decisions.md` |
| **Composable** | 3 | Hidden test: routes no contienen lógica. Services llaman repos. DI limpia | Arquitectura limpia: routes → services → repositories |
| **Executable** | 3 | Hidden test: status codes correctos, response shapes correctas, contratos de API | Todos los 15 endpoints con contratos exactos |

### Arquitectura de Carpetas

```
src/
├── index.ts              # Express app setup + listen
├── app.ts                # Express app factory (sin listen, para testing)
├── config/
│   └── index.ts          # Constantes desde env: MAX_PARTICIPANTS, PENALTY_PCT, JWT_SECRET, PORT
├── db/
│   └── database.ts       # Singleton better-sqlite3 + schema DDL
├── errors/
│   └── index.ts          # Jerarquía: AppError → NotFoundError, ValidationError, ForbiddenError, ConflictError
├── middleware/
│   ├── auth.ts           # JWT verify middleware
│   └── errorHandler.ts   # Catch-all error → JSON response con status correcto
├── repositories/
│   ├── userRepository.ts
│   ├── tandaRepository.ts
│   ├── participantRepository.ts
│   └── contributionRepository.ts
├── services/
│   ├── userService.ts
│   ├── tandaService.ts
│   ├── participantService.ts
│   └── contributionService.ts
├── routes/
│   ├── userRoutes.ts
│   ├── tandaRoutes.ts
│   └── index.ts          # Mount all routes
├── validators/
│   └── schemas.ts        # Zod schemas por endpoint
└── tests/
    ├── users.test.ts
    ├── tandas.test.ts
    ├── participants.test.ts
    └── contributions.test.ts
```

### Fases de Implementación (cada una = 1 commit convencional)

**Fase 1 — Infraestructura base** (`chore: project scaffolding`)
- `config/index.ts`: MAX_PARTICIPANTS (20), PENALTY_PCT (0.05), JWT_SECRET vía `process.env.JWT_SECRET`, PORT
- `db/database.ts`: singleton SQLite in-memory para tests, file para prod. Schema DDL: users, tandas, participants, contributions
- `errors/index.ts`: AppError base + NotFoundError(404), ValidationError(400), ForbiddenError(403), ConflictError(409)
- `middleware/errorHandler.ts`: catch-all que mapea AppError → { error: message } + status
- `app.ts`: factory que retorna Express app sin `.listen()` (para supertest)
- `index.ts`: importar app + `.listen(PORT)`

**Fase 2 — Capa de repositorios** (`feat: add repository layer`)
- `userRepository.ts`: create, findAll, findById, findByEmail
- `tandaRepository.ts`: create, findAll(userId), findById, updateStatus, updateCurrentRound
- `participantRepository.ts`: create, findByTandaId, findByUserAndTanda, countByTanda, updateRotationPositions
- `contributionRepository.ts`: create, findByTandaAndRound, findByParticipant, findConsecutiveMissed

**Fase 3 — Capa de servicios** (`feat: add service layer with business rules`)
- `userService.ts`: createUser (validar email único), getUsers, getUserById
- `tandaService.ts`:
  - createTanda: crear tanda + auto-join organizador como participant con role `organizer`
  - getTandas(userId), getTandaById
  - startTanda: validar ≥3 participantes, status=forming, randomizar rotationPosition, status→active, totalRounds=N
  - cancelTanda: validar organizer, status forming/active → cancelled
  - advanceRound: validar organizer, marcar missed contributions, verificar 2 consecutivos missed → defaulter, currentRound++, si último → completed
- `participantService.ts`: joinTanda (validar forming, no duplicado, ≤MAX_PARTICIPANTS), getParticipants
- `contributionService.ts`:
  - recordContribution: validar round=currentRound, no duplicada, calcular penalty 5% si late
  - getRoundSummary: contributions del round + quién falta
  - getParticipantHistory

**Fase 4 — Validadores Zod + Rutas** (`feat: add routes with Zod validation`)
- `validators/schemas.ts`: schemas para cada body de request
- `routes/userRoutes.ts`: POST/GET /api/users, GET /api/users/:id → solo parseo + llamar service
- `routes/tandaRoutes.ts`: todos los endpoints de tandas → solo parseo + llamar service
- `routes/index.ts`: montar routers
- **CERO lógica de negocio, CERO llamadas a DB en routes**

**Fase 5 — Tests** (`test: add endpoint tests`)
- Por endpoint: happy-path + al menos un caso 4xx
- Usar supertest con app factory (sin levantar servidor)
- Cubrir reglas de negocio clave: min 3 participantes, max 20, rotation randomized, penalty 5%, 2 missed → defaulter, auto-complete
- Target: ≥60% coverage

**Fase 6 — Scoring artifacts** (`chore: add CI and docs`)
- `.github/workflows/ci.yml`: checkout → install → typecheck → test (para **Defended** = 1pt)
- `docs/decisions.md`: documentar 1 decisión de diseño (ej: "elegimos SQLite in-memory para tests para evitar fixtures") (para **Auditable** decision log = 1pt)
- Actualizar `README.md` con descripción del proyecto, setup, arquitectura, endpoints (para **Self-describing** = 1pt)

**Fase 7 — Validación final** (`chore: final validation`)
- `npm run typecheck` → 0 errores TS
- `npm test` → todos pasan, ≥60% coverage
- Verificar: 0 `db.*` calls en routes/
- Verificar: ≥50% commits convencionales
- `npm run score` → validar score.json

### Reglas de Negocio Críticas (para Executable 3pts)

1. POST `/api/tandas` → organizer auto-joins, status=`forming`, currentRound=0
2. POST `/api/tandas/:id/start` → 403 si no es organizer, 400 si <3 participants, randomizar rotation, status→`active`, currentRound=1
3. POST `/api/tandas/:id/join` → 400 si no forming, 409 si ya es miembro, 400 si max participants
4. POST `/api/tandas/:id/contributions` → validar round actual, amount=contributionAmount, penalty 5% si late
5. POST `/api/tandas/:id/advance` → 403 si no organizer, marcar pending→missed, detectar 2 missed consecutivos, auto-complete si último round
6. GET `/api/tandas/:id/rounds/:round` → contributions + payout recipient (rotationPosition==round)
7. Status transitions: `forming→active→completed`, `forming/active→cancelled`

### Respuestas HTTP esperadas (para Executable)

- 201 para creaciones exitosas (POST users, tandas, join, contributions)
- 200 para GETs y acciones (start, cancel, advance)
- 400 para validaciones fallidas
- 403 para acciones no autorizadas (no organizer)
- 404 para recursos no encontrados
- 409 para conflictos (email duplicado, ya es miembro)
