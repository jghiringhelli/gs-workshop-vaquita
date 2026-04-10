import { Hono } from "hono";

export const tandaRoutes = new Hono();

// POST /api/tandas — Create a tanda (creator = organizer, auto-joins)
tandaRoutes.post("/", async (c) => {
  return c.json({ message: "TODO: create tanda" }, 501);
});

// GET /api/tandas — List tandas for a user (?userId=)
tandaRoutes.get("/", async (c) => {
  return c.json({ message: "TODO: list tandas" }, 501);
});

// GET /api/tandas/:id — Get tanda details
tandaRoutes.get("/:id", async (c) => {
  return c.json({ message: "TODO: get tanda" }, 501);
});

// POST /api/tandas/:id/join — Join a tanda
tandaRoutes.post("/:id/join", async (c) => {
  return c.json({ message: "TODO: join tanda" }, 501);
});

// POST /api/tandas/:id/start — Start (organizer only — FORMING → ACTIVE)
tandaRoutes.post("/:id/start", async (c) => {
  return c.json({ message: "TODO: start tanda" }, 501);
});

// POST /api/tandas/:id/cancel — Cancel (organizer only)
tandaRoutes.post("/:id/cancel", async (c) => {
  return c.json({ message: "TODO: cancel tanda" }, 501);
});

// GET /api/tandas/:id/participants — List participants
tandaRoutes.get("/:id/participants", async (c) => {
  return c.json({ message: "TODO: list participants" }, 501);
});

// POST /api/tandas/:id/contributions — Record a contribution for the current round
tandaRoutes.post("/:id/contributions", async (c) => {
  return c.json({ message: "TODO: record contribution" }, 501);
});

// GET /api/tandas/:id/rounds/:round — Round summary
tandaRoutes.get("/:id/rounds/:round", async (c) => {
  return c.json({ message: "TODO: round summary" }, 501);
});

// POST /api/tandas/:id/advance — Advance to next round (organizer only)
tandaRoutes.post("/:id/advance", async (c) => {
  return c.json({ message: "TODO: advance round" }, 501);
});

// GET /api/tandas/:id/participants/:pid/history — Contribution history
tandaRoutes.get("/:id/participants/:pid/history", async (c) => {
  return c.json({ message: "TODO: contribution history" }, 501);
});

