import { Router } from "express";
import { z } from "zod";
import type { TandaService } from "./tanda.service.js";

const createTandaSchema = z.object({
  name: z.string().min(1).max(100),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().int().positive(),
});

const joinSchema = z.object({
  userId: z.string().uuid(),
});

const startSchema = z.object({
  organizerId: z.string().uuid(),
});

const cancelSchema = z.object({
  organizerId: z.string().uuid(),
});

const advanceSchema = z.object({
  organizerId: z.string().uuid(),
});

/**
 * Mounts tanda routes onto an Express Router.
 * @param tandaService - The TandaService instance to delegate to.
 * @returns Configured Express Router.
 */
export function createTandaRouter(tandaService: TandaService): Router {
  const router = Router();

  router.post("/", (req, res, next) => {
    try {
      const parsed = createTandaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        return;
      }
      const tanda = tandaService.create(parsed.data);
      res.status(201).json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.get("/", (req, res, next) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        res.status(400).json({ errors: { userId: ["userId query param is required"] } });
        return;
      }
      const tandas = tandaService.listByUser(userId);
      res.json({ data: tandas });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", (req, res, next) => {
    try {
      const tanda = tandaService.findById(req.params["id"] ?? "");
      res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/join", (req, res, next) => {
    try {
      const parsed = joinSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        return;
      }
      const participant = tandaService.join(req.params["id"] ?? "", parsed.data.userId);
      res.status(201).json({ data: participant });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/start", (req, res, next) => {
    try {
      const parsed = startSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        return;
      }
      const tanda = tandaService.start(req.params["id"] ?? "", parsed.data.organizerId);
      res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/cancel", (req, res, next) => {
    try {
      const parsed = cancelSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        return;
      }
      const tanda = tandaService.cancel(req.params["id"] ?? "", parsed.data.organizerId);
      res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/advance", (req, res, next) => {
    try {
      const parsed = advanceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        return;
      }
      const tanda = tandaService.advance(req.params["id"] ?? "", parsed.data.organizerId);
      res.json({ data: tanda });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/participants", (req, res, next) => {
    try {
      const participants = tandaService.listParticipants(req.params["id"] ?? "");
      res.json({ data: participants });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
