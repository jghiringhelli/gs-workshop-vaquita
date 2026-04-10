# 🫰 Tanda API

REST API para gestionar **tandas** (grupos de ahorro rotativo / vaquitas).

Una tanda es un grupo de N personas que cada ronda aportan una cantidad fija.
Cada ronda, un participante recibe el pozo completo. Al finalizar N rondas,
todos han recibido exactamente una vez.

## Lo que se construyó

- **15 endpoints REST** — usuarios, tandas, participantes, contribuciones, rondas e historial
- **Arquitectura en 3 capas** — routes → services → repositories (sin SQL en handlers)
- **Reglas de negocio** — mínimo 3 participantes, rotación aleatoria al iniciar, penalización 5% por pago tardío, auto-completar en última ronda
- **Endpoint extra** — `GET /api/tandas/:id/stats` con dashboard de la tanda
- **25 tests** con supertest, cobertura en todos los endpoints

## Setup

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # correr tests
```

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/users | Crear usuario |
| GET | /api/users | Listar usuarios |
| GET | /api/users/:id | Obtener usuario |
| POST | /api/tandas | Crear tanda |
| GET | /api/tandas | Listar tandas |
| POST | /api/tandas/:id/start | Iniciar tanda |
| POST | /api/tandas/:id/join | Unirse a tanda |
| POST | /api/tandas/:id/contributions | Registrar contribución |
| POST | /api/tandas/:id/advance | Avanzar ronda |
| GET | /api/tandas/:id/stats | Dashboard de la tanda |

Open `START.md` — it has your task brief, scoring rubric, and step-by-step instructions for your group.

---

## How scoring works

Every time you push to your `participant/PXXX` branch, a GitHub Actions workflow runs automatically:

1. Checks out your code
2. Runs `npm run score` — a scoring script that analyses your repo against 7 code quality properties
3. Writes the result to `score.json` on your branch (committed by the bot)
4. Uploads it as a workflow artifact

**You never need to run scoring manually.** Push your code → wait ~60s → check the Actions tab.

The score is re-computed on every push, so the latest push always reflects your current state.

---

## What gets scored (automated, 8 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass hidden live tests (HTTP status codes, response shapes) |
| **Composable** | 3 | Business logic does not leak into route handlers (hidden live test) |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `db.*` calls in route files |
| **Auditable** | 2 | ≥50% conventional commits + one decision log entry |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |

Executable and Composable are scored via hidden live tests after the session. The other 8 points are computed automatically on every push and visible in your `score.json`.

---

## Scoring is blind

`score.ts` receives no information about which experimental condition you are in — it analyses whatever code is on your branch. This makes the experiment inherently double-blind by design.

---

## What good looks like

- Business rules enforced (min 3 participants, rotation locked on start, auto-complete after last round)
- No SQL in route handlers — services and repositories are separate layers
- JWT secret comes from an env var, never hardcoded
- Every endpoint has at least one test