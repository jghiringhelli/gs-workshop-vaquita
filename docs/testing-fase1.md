# Pruebas Funcionales — Fase 1: Infraestructura Base

## Pre-requisitos

- Node.js instalado
- Dependencias instaladas (`npm install`)
- Dos terminales abiertas

---

## 1. Arranque del servidor

**Terminal 1 — levantar el servidor:**
```bash
npm run dev
```

**Resultado esperado:**
```
Tanda API running on http://localhost:3000
```

Si el servidor no arranca, revisar que el puerto 3000 esté libre:
```bash
# Windows
netstat -ano | findstr :3000
```

---

## 2. Verificar que el servidor responde

```bash
curl -s http://localhost:3000
```

**Resultado esperado:** cualquier respuesta HTTP (incluso 404), lo que confirma que Express está corriendo.

---

## 3. Manejo de rutas no existentes (404)

```bash
curl -s -o - -w "\nHTTP Status: %{http_code}\n" http://localhost:3000/ruta-inexistente
```

**Resultado esperado:**
```
HTTP Status: 404
```

---

## 4. Manejo global de errores (errorHandler middleware)

El middleware `errorHandler` mapea `AppError` → JSON con `{ error: "..." }` y el `statusCode` correcto. Se verificará completamente cuando los servicios estén implementados (Fase 3), pero la estructura ya está activa.

---

## 5. Variables de entorno (config)

### 5.1 Puerto personalizado

**Terminal 1 — detener el servidor (Ctrl+C) y relanzar con puerto diferente:**
```bash
PORT=4000 npm run dev
# Windows PowerShell:
$env:PORT="4000"; npm run dev
```

**Resultado esperado:**
```
Tanda API running on http://localhost:4000
```

```bash
curl -s -o - -w "\nHTTP Status: %{http_code}\n" http://localhost:4000
```

### 5.2 Máximo de participantes y penalización (validación visual)

Estas constantes se leen de env vars. Valores por defecto:

| Variable | Default | Descripción |
|---|---|---|
| `MAX_PARTICIPANTS` | `20` | Máximo de miembros por tanda |
| `PENALTY_PCT` | `0.05` | 5% de penalización por pago tardío |
| `JWT_SECRET` | `dev-secret-change-me` | Secreto JWT (cambiar en producción) |
| `DB_PATH` | `tanda.db` | Ruta del archivo SQLite (prod) |

Para verificar que se leen correctamente:
```bash
MAX_PARTICIPANTS=5 PENALTY_PCT=0.10 npm run dev
# Windows PowerShell:
$env:MAX_PARTICIPANTS="5"; $env:PENALTY_PCT="0.10"; npm run dev
```

---

## 6. Base de datos SQLite

### 6.1 Verificar creación del archivo (modo producción)

Al arrancar el servidor en modo no-test, se crea `tanda.db` en la raíz del proyecto:

```bash
# Después de npm run dev (sin NODE_ENV=test):
ls tanda.db
# o en PowerShell:
Test-Path tanda.db
```

**Resultado esperado:** `True` / archivo visible.

### 6.2 Verificar schema creado

```bash
# Requiere sqlite3 CLI instalado
sqlite3 tanda.db ".tables"
```

**Resultado esperado:**
```
contributions  participants  tandas  users
```

```bash
sqlite3 tanda.db ".schema users"
```

**Resultado esperado:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 6.3 Verificar modo in-memory en tests

```bash
NODE_ENV=test npm run dev
```

No debe crearse ni modificarse el archivo `tanda.db`. Cada vez que se reinicia con `NODE_ENV=test`, la base de datos empieza vacía.

---

## 7. Verificación de tipos TypeScript

```bash
npm run typecheck
```

**Resultado esperado:** sin output (cero errores).

---

## 8. Limpieza

Detener el servidor con `Ctrl+C` en Terminal 1.

Opcional — eliminar la base de datos de prueba:
```bash
# PowerShell
Remove-Item tanda.db -ErrorAction SilentlyContinue
```

---

## Checklist resumen

- [ ] `npm run dev` arranca sin errores
- [ ] Servidor responde en `http://localhost:3000`
- [ ] Puerto configurable vía `PORT` env var
- [ ] `tanda.db` se crea con las 4 tablas en modo producción
- [ ] `NODE_ENV=test` usa base de datos in-memory (sin archivo)
- [ ] `npm run typecheck` → 0 errores
