import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config/env";
import { requireAuth, requireSameUser } from "../middleware/auth-middleware";
import { HealthRepository } from "../repositories/health-repository";
import { UserRepository } from "../repositories/user-repository";
import { TandaRepository } from "../repositories/tanda-repository";
import { ParticipantRepository } from "../repositories/participant-repository";
import { ContributionRepository } from "../repositories/contribution-repository";
import { AuthService } from "../services/auth-service";
import { HealthService } from "../services/health-service";
import { UserService } from "../services/user-service";
import { TandaService } from "../services/tanda-service";
import { parseSchema } from "./validation";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
});

const createTandaSchema = z.object({
  name: z.string().min(1).max(120),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().int().positive(),
});

const userIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
const tandaIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
const listTandasQuerySchema = z.object({ userId: z.coerce.number().int().positive() });
const joinTandaSchema = z.object({ userId: z.number().int().positive() });
const organizerActionSchema = z.object({ organizerId: z.number().int().positive() });
const roundParamSchema = z.object({ round: z.coerce.number().int().positive() });
const participantHistoryParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
});
const recordContributionSchema = z.object({
  participantId: z.number().int().positive(),
  isLate: z.boolean().optional(),
});

const issueTokenSchema = z.object({ userId: z.number().int().positive() });

/**
 * Creates and returns the main API router.
 * All repositories and services are instantiated here at runtime.
 * @param config - resolved application configuration
 * @returns configured Express Router
 */
export function createApiRoutes(config: AppConfig): Router {
  const router = Router();

  const healthRepository = new HealthRepository();
  const userRepository = new UserRepository();
  const tandaRepository = new TandaRepository();
  const participantRepository = new ParticipantRepository();
  const contributionRepository = new ContributionRepository();

  const authService = new AuthService(userRepository, config);
  const healthService = new HealthService(healthRepository, config);
  const userService = new UserService(userRepository);
  const tandaService = new TandaService(
    tandaRepository, userRepository, participantRepository, contributionRepository, config,
  );

  const authGuard = requireAuth(authService);

  // ── Health ──────────────────────────────────────────────────────────────────
  router.get("/health", (_req, res) => {
    res.status(200).json(healthService.getHealth());
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  router.post("/auth/token", (req, res, next) => {
    try {
      const { userId } = parseSchema(issueTokenSchema, req.body);
      res.status(200).json({ token: authService.issueToken(userId) });
    } catch (err) { next(err); }
  });

  // ── Users ───────────────────────────────────────────────────────────────────
  router.post("/users", (req, res, next) => {
    try {
      const body = parseSchema(createUserSchema, req.body);
      res.status(201).json(userService.createUser(body));
    } catch (err) { next(err); }
  });

  router.get("/users", (_req, res, next) => {
    try {
      res.status(200).json(userService.listUsers());
    } catch (err) { next(err); }
  });

  router.get("/users/:id", (req, res, next) => {
    try {
      const { id } = parseSchema(userIdParamSchema, req.params);
      res.status(200).json(userService.getUserById(id));
    } catch (err) { next(err); }
  });

  // ── Tandas ──────────────────────────────────────────────────────────────────
  router.post("/tandas", authGuard, (req, res, next) => {
    try {
      const body = parseSchema(createTandaSchema, req.body);
      requireSameUser(res.locals.authUserId as number, body.organizerId);
      res.status(201).json(tandaService.createTanda(body));
    } catch (err) { next(err); }
  });

  router.get("/tandas", (req, res, next) => {
    try {
      const { userId } = parseSchema(listTandasQuerySchema, req.query);
      res.status(200).json(tandaService.listTandasForUser(userId));
    } catch (err) { next(err); }
  });

  router.get("/tandas/:id", (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      res.status(200).json(tandaService.getTandaById(id));
    } catch (err) { next(err); }
  });

  // ── Participants ─────────────────────────────────────────────────────────────
  router.post("/tandas/:id/join", authGuard, (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      const { userId } = parseSchema(joinTandaSchema, req.body);
      requireSameUser(res.locals.authUserId as number, userId);
      res.status(201).json(tandaService.joinTanda({ tandaId: id, userId }));
    } catch (err) { next(err); }
  });

  router.get("/tandas/:id/participants", (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      res.status(200).json(tandaService.listParticipants(id));
    } catch (err) { next(err); }
  });

  // ── Tanda lifecycle ──────────────────────────────────────────────────────────
  router.post("/tandas/:id/start", authGuard, (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      const { organizerId } = parseSchema(organizerActionSchema, req.body);
      requireSameUser(res.locals.authUserId as number, organizerId);
      res.status(200).json(tandaService.startTanda({ tandaId: id, organizerId }));
    } catch (err) { next(err); }
  });

  router.post("/tandas/:id/cancel", authGuard, (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      const { organizerId } = parseSchema(organizerActionSchema, req.body);
      requireSameUser(res.locals.authUserId as number, organizerId);
      res.status(200).json(tandaService.cancelTanda({ tandaId: id, organizerId }));
    } catch (err) { next(err); }
  });

  router.post("/tandas/:id/advance", authGuard, (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      const { organizerId } = parseSchema(organizerActionSchema, req.body);
      requireSameUser(res.locals.authUserId as number, organizerId);
      res.status(200).json(tandaService.advanceRound({ tandaId: id, organizerId }));
    } catch (err) { next(err); }
  });

  // ── Contributions ────────────────────────────────────────────────────────────
  router.post("/tandas/:id/contributions", authGuard, (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      const body = parseSchema(recordContributionSchema, req.body);
      res.status(201).json(tandaService.recordContribution({
        tandaId: id,
        participantId: body.participantId,
        actorUserId: res.locals.authUserId as number,
        isLate: body.isLate,
      }));
    } catch (err) { next(err); }
  });

  // ── Rounds ───────────────────────────────────────────────────────────────────
  router.get("/tandas/:id/rounds/:round", (req, res, next) => {
    try {
      const { id } = parseSchema(tandaIdParamSchema, req.params);
      const { round } = parseSchema(roundParamSchema, req.params);
      res.status(200).json(tandaService.getRoundSummary({ tandaId: id, round }));
    } catch (err) { next(err); }
  });

  // ── Participant history ───────────────────────────────────────────────────────
  router.get("/tandas/:id/participants/:pid/history", (req, res, next) => {
    try {
      const { id, pid } = parseSchema(participantHistoryParamSchema, req.params);
      res.status(200).json(tandaService.getParticipantHistory({ tandaId: id, participantId: pid }));
    } catch (err) { next(err); }
  });

  return router;
}
