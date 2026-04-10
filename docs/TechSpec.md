# Tech Spec: Tanda/Vaquita API

## Overview

API REST para gestionar **tandas** (vaquitas): grupos de ahorro rotativo donde N participantes aportan una cantidad fija cada ronda y uno recibe el fondo completo por turno. El sistema garantiza transparencia, trazabilidad y cumplimiento de reglas de negocio mediante un ledger inmutable y lógica de rotación bloqueada al iniciar.

---

## 1. Modelo de Dominio

### Entidades y relaciones

```
User (1) ──< Participant (N) >── Tanda (1)
                                    │
                              Contribution (N)
```

| Entidad | Campos | Descripción |
|---------|--------|-------------|
| **User** | `id`, `email`, `name` | Usuario registrado. Puede participar en múltiples tandas. |
| **Tanda** | `id`, `name`, `organizerId`, `contributionAmount`, `status`, `currentRound`, `totalRounds` | Grupo de ahorro. `totalRounds` = número de participantes. |
| **Participant** | `id`, `userId`, `tandaId`, `role`, `rotationPosition` | Vínculo User↔Tanda. `role`: `organizer` o `member`. `rotationPosition` se asigna al iniciar. |
| **Contribution** | `id`, `tandaId`, `participantId`, `round`, `amount`, `status` | Registro de pago por ronda. `status`: `pending`, `paid`, `late`, `missed`. |

### Relaciones clave
- Un **User** puede ser **Participant** en múltiples Tandas.
- Una **Tanda** tiene N **Participants** (min 3, max 20).
- El **organizador** es automáticamente el primer Participant.
- Cada **Participant** genera una **Contribution** por ronda.
- `totalRounds` = cantidad de participantes (cada uno recibe exactamente una vez).

### Estados de Tanda (máquina de estados)
```
FORMING ──→ ACTIVE ──→ COMPLETED
   │           │
   └───────────┴──→ CANCELLED
```

---

## 2. Endpoints de la API

### Users
| Method | Path | Descripción | Status codes |
|--------|------|-------------|--------------|
| `POST` | `/api/users` | Crear usuario | 201, 400 |
| `GET` | `/api/users` | Listar usuarios | 200 |
| `GET` | `/api/users/:id` | Obtener usuario por ID | 200, 404 |

### Tandas — Ciclo de vida
| Method | Path | Descripción | Status codes |
|--------|------|-------------|--------------|
| `POST` | `/api/tandas` | Crear tanda (creador = organizador, auto-join) | 201, 400 |
| `GET` | `/api/tandas` | Listar tandas (`?userId=`) | 200 |
| `GET` | `/api/tandas/:id` | Detalle de tanda | 200, 404 |
| `POST` | `/api/tandas/:id/join` | Unirse a tanda | 200, 400, 404, 409 |
| `POST` | `/api/tandas/:id/start` | Iniciar tanda (solo organizador) | 200, 400, 403 |
| `POST` | `/api/tandas/:id/cancel` | Cancelar tanda (solo organizador) | 200, 403, 409 |

### Tandas — Participantes y contribuciones
| Method | Path | Descripción | Status codes |
|--------|------|-------------|--------------|
| `GET` | `/api/tandas/:id/participants` | Listar participantes | 200, 404 |
| `POST` | `/api/tandas/:id/contributions` | Registrar contribución de ronda actual | 201, 400, 409, 422 |
| `GET` | `/api/tandas/:id/rounds/:round` | Resumen de ronda | 200, 404 |
| `POST` | `/api/tandas/:id/advance` | Avanzar a siguiente ronda (solo organizador) | 200, 403, 409 |
| `GET` | `/api/tandas/:id/participants/:pid/history` | Historial de contribuciones | 200, 404 |

---

## 3. Reglas de Negocio (lógica en servicios)

| # | Regla | Impacto |
|---|-------|---------|
| 1 | Mínimo **3 participantes** para iniciar | Bloquea `start` si < 3 |
| 2 | Máximo **20 participantes** (configurable via `config.ts`) | Bloquea `join` si >= max |
| 3 | Organizador es **auto-join** como primer participante | Se crea al crear la tanda |
| 4 | Orden de rotación se **aleatoriza** al hacer FORMING → ACTIVE | Asigna `rotationPosition` |
| 5 | Contribuciones deben ser del monto exacto de la tanda | Valida `amount === contributionAmount` |
| 6 | Contribución tardía: **penalización del 5%** (configurable) | `status = late`, `amount *= 1.05` |
| 7 | **2 contribuciones consecutivas perdidas** → flagged como defaulter | Marca en avance de ronda |
| 8 | Solo el **organizador** puede avanzar rondas, iniciar y cancelar | Validar `role === organizer` |
| 9 | La tanda se **auto-completa** tras la última ronda | `advance` en última ronda → COMPLETED |
| 10 | Transiciones válidas: `FORMING→ACTIVE→COMPLETED`, `FORMING/ACTIVE→CANCELLED` | Rechazar transiciones inválidas |

---

## 4. Áreas Críticas (riesgo alto)

| Área | Riesgo | Mitigación |
|------|--------|------------|
| **Avance de ronda** | Saltar rondas o avanzar sin registrar contribuciones → dinero perdido | Validar que no se pueda avanzar sin marcar missed. Auto-completar en última ronda |
| **Rotación** | Asignar dos veces al mismo participante o saltarse uno | Aleatorizar una sola vez al iniciar; bloquear cambios posteriores |
| **Doble contribución** | Un participante paga dos veces la misma ronda | Validar unicidad `(participantId, round)` con constraint o check previo |
| **Transiciones de estado** | Iniciar una tanda ya activa, cancelar una completada | Validar estado actual antes de cada transición |
| **Penalización** | Aplicar porcentaje incorrecto o no aplicarlo | Centralizar cálculo en servicio; usar constante configurable |
| **Monto de contribución** | Aceptar montos diferentes al configurado | Validar exacto match contra `tanda.contributionAmount` |

---

## 5. Arquitectura — Separación de capas

```
┌─────────────────────────────────────────┐
│             Routes (Express)            │  ← Solo HTTP: parsear request, llamar servicio, enviar response
│  users.routes.ts  │  tandas.routes.ts   │
├─────────────────────────────────────────┤
│             Services                    │  ← Toda la lógica de negocio
│  users.service.ts │  tandas.service.ts  │
├─────────────────────────────────────────┤
│             Repositories                │  ← Solo SQL/acceso a datos
│  users.repo.ts    │  tandas.repo.ts     │
│  participants.repo.ts │ contributions.repo.ts │
├─────────────────────────────────────────┤
│             Database (SQLite)           │
│  db.ts (better-sqlite3)                 │
└─────────────────────────────────────────┘
```

### Regla estricta
- **Routes**: NO contienen SQL ni lógica de negocio. Solo traducen HTTP ↔ servicio.
- **Services**: Contienen TODA la lógica de negocio. Llaman a repositories.
- **Repositories**: SQL puro. Sin lógica de negocio.

---

## 6. Estructura de archivos objetivo

```
src/
├── index.ts                 # Entry point: crea app y escucha en puerto
├── app.ts                   # Express app: registra rutas y middleware
├── db.ts                    # Conexión SQLite + inicialización de tablas
├── config.ts                # Constantes configurables (MAX_PARTICIPANTS, PENALTY_RATE, etc.)
├── errors.ts                # Clases de error custom (NotFoundError, ValidationError, ForbiddenError, ConflictError)
├── types.ts                 # Interfaces TypeScript (User, Tanda, Participant, Contribution)
├── middleware/
│   └── errorHandler.ts      # Middleware global de errores
├── repositories/
│   ├── users.repository.ts
│   ├── tandas.repository.ts
│   ├── participants.repository.ts
│   └── contributions.repository.ts
├── services/
│   ├── users.service.ts
│   └── tandas.service.ts
├── routes/
│   ├── users.routes.ts
│   └── tandas.routes.ts
└── __tests__/
    ├── users.test.ts
    └── tandas.test.ts
```

---

## 7. Esquema de Base de Datos (SQLite)

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tandas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organizer_id INTEGER NOT NULL REFERENCES users(id),
  contribution_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'forming' CHECK(status IN ('forming','active','completed','cancelled')),
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  tanda_id INTEGER NOT NULL REFERENCES tandas(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('organizer','member')),
  rotation_position INTEGER,
  UNIQUE(user_id, tanda_id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanda_id INTEGER NOT NULL REFERENCES tandas(id),
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  round INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','late','missed')),
  UNIQUE(participant_id, round)
);
```

---

## 8. Flujo de datos (casos de uso principales)

### UC-001: Crear y arrancar una tanda
1. `POST /api/tandas` → Route parsea body → Service valida y crea tanda + participant(organizer) → Repository inserta en DB
2. `POST /api/tandas/:id/join` → Service valida (status=forming, no duplicado, no llena) → Repository inserta participant
3. `POST /api/tandas/:id/start` → Service valida (>=3 participantes, caller=organizer) → aleatoriza rotación → actualiza status a active, totalRounds = N

### UC-002: Registrar contribución
1. `POST /api/tandas/:id/contributions` → Service valida (tanda activa, monto correcto, no duplicado en ronda) → Repository inserta contribution con status paid/late

### UC-003: Avanzar ronda
1. `POST /api/tandas/:id/advance` → Service valida (caller=organizer, tanda activa) → marca missed si falta → incrementa currentRound → si última ronda → status=completed

---

## 9. Seguridad

- **Validación de entrada**: Zod en cada endpoint (body, params, query)
- **Errores custom**: jerarquía de errores (NotFound, Validation, Forbidden, Conflict) — nunca `throw new Error()` genérico
- **Config segura**: secrets y constantes desde variables de entorno
- **SQL seguro**: usar prepared statements (better-sqlite3 lo hace por defecto)
- **Sin SQL en routes**: separación estricta de capas

---

## 10. Constantes configurables (config.ts)

| Constante | Valor default | Descripción |
|-----------|---------------|-------------|
| `MIN_PARTICIPANTS` | 3 | Mínimo para iniciar tanda |
| `MAX_PARTICIPANTS` | 20 | Máximo por tanda |
| `LATE_PENALTY_RATE` | 0.05 | 5% de penalización por contribución tardía |
| `PORT` | 3000 | Puerto del servidor |

---

## 11. Dependencias

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `express` | ^4.21.0 | Framework HTTP |
| `better-sqlite3` | ^11.7.0 | Base de datos SQLite embebida |
| `zod` | ^3.24.0 | Validación de schemas |
| `uuid` | ^11.1.0 | Generación de IDs únicos |
| `typescript` | ^5.7.0 | Lenguaje |
| `vitest` | ^3.0.0 | Testing |
| `supertest` | ^7.0.0 | Testing HTTP |
| `tsx` | ^4.19.0 | Ejecutar TS en desarrollo |

---

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Doble contribución en misma ronda | M | H | Constraint UNIQUE(participant_id, round) + validación en servicio |
| Rotación incorrecta | L | H | Aleatorizar una sola vez; guardar posición en DB; bloquear cambios |
| Avance de ronda sin cerrar contribuciones | M | H | Marcar automáticamente missed antes de avanzar |
| SQL en route handlers | M | M | Code review + scoring automático lo detecta |
| Transición de estado inválida | M | H | Validar estado actual antes de cada transición en servicio |
| Monto incorrecto aceptado | L | H | Validar amount === contributionAmount en servicio |
