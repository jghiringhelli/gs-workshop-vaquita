import { Router } from "express";
import { z } from "zod";

import type { AppConfig } from "../config/env";
import {
  requireAuth,
  requireSameUserAction,
} from "../middleware/auth-middleware";
import { ContributionRepository } from "../repositories/contribution-repository";
import { HealthRepository } from "../repositories/health-repository";
import { ParticipantRepository } from "../repositories/participant-repository";
import { TandaRepository } from "../repositories/tanda-repository";
import { UserRepository } from "../repositories/user-repository";
import { AuthService } from "../services/auth-service";
import { HealthService } from "../services/health-service";
import { TandaService } from "../services/tanda-service";
import { UserService } from "../services/user-service";
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

const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const tandaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listTandasQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const joinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

const organizerActionSchema = z.object({
  organizerId: z.number().int().positive(),
});

const recordContributionSchema = z.object({
  participantId: z.number().int().positive(),
  isLate: z.boolean().optional(),
});

const roundParamSchema = z.object({
  round: z.coerce.number().int().positive(),
});

const participantHistoryParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  pid: z.coerce.number().int().positive(),
});

const issueTokenSchema = z.object({
  userId: z.number().int().positive(),
});

export function createApiRoutes(config: AppConfig): Router {
  const router = Router();

  const healthRepository = new HealthRepository();
  const userRepository = new UserRepository();
  const tandaRepository = new TandaRepository();
  const participantRepository = new ParticipantRepository();
  const contributionRepository = new ContributionRepository();

  const healthService = new HealthService(healthRepository, config);
  const authService = new AuthService(userRepository, config);
  const userService = new UserService(userRepository);
  const tandaService = new TandaService(
    tandaRepository,
    userRepository,
    participantRepository,
    contributionRepository,
    config
  );

  const authRequired = requireAuth(authService);

  router.get("/health", (_req, res) => {
    const payload = healthService.getHealth();
    res.status(200).json(payload);
  });

  router.post("/auth/token", (req, res, next) => {
    try {
      const body = parseSchema(issueTokenSchema, req.body);
      const token = authService.issueToken(body.userId);
      res.status(200).json({ token });
    } catch (error) {
      next(error);
    }
  });

  router.post("/users", (req, res, next) => {
    try {
      const body = parseSchema(createUserSchema, req.body);
      const user = userService.createUser(body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  router.get("/users", (_req, res, next) => {
    try {
      const users = userService.listUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  });

  router.get("/users/:id", (req, res, next) => {
    try {
      const params = parseSchema(userIdParamSchema, req.params);
      const user = userService.getUserById(params.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  });

  router.post("/tandas", authRequired, (req, res, next) => {
    try {
      const body = parseSchema(createTandaSchema, req.body);
      const authUserId = res.locals.authUserId as number;
      requireSameUserAction(authUserId, body.organizerId);
      const tanda = tandaService.createTanda(body);
      res.status(201).json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.get("/tandas", (req, res, next) => {
    try {
      const query = parseSchema(listTandasQuerySchema, req.query);
      const tandas = tandaService.listTandasForUser(query.userId);
      res.status(200).json(tandas);
    } catch (error) {
      next(error);
    }
  });

  router.get("/tandas/:id", (req, res, next) => {
    try {
      const params = parseSchema(tandaIdParamSchema, req.params);
      const tanda = tandaService.getTandaById(params.id);
      res.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.post("/tandas/:id/join", authRequired, (req, res, next) => {
    try {
      const params = parseSchema(tandaIdParamSchema, req.params);
      const body = parseSchema(joinTandaSchema, req.body);
      const authUserId = res.locals.authUserId as number;
      requireSameUserAction(authUserId, body.userId);
      const participant = tandaService.joinTanda({
        tandaId: params.id,
        userId: body.userId,
      });
      res.status(201).json(participant);
    } catch (error) {
      next(error);
    }
  });

  router.get("/tandas/:id/participants", (req, res, next) => {
    try {
      const params = parseSchema(tandaIdParamSchema, req.params);
      const participants = tandaService.listParticipants(params.id);
      res.status(200).json(participants);
    } catch (error) {
      next(error);
    }
  });

  router.post("/tandas/:id/start", authRequired, (req, res, next) => {
    try {
      const params = parseSchema(tandaIdParamSchema, req.params);
      const body = parseSchema(organizerActionSchema, req.body);
      const authUserId = res.locals.authUserId as number;
      requireSameUserAction(authUserId, body.organizerId);
      const tanda = tandaService.startTanda({
        tandaId: params.id,
        organizerId: body.organizerId,
      });
      res.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.post("/tandas/:id/cancel", authRequired, (req, res, next) => {
    try {
      const params = parseSchema(tandaIdParamSchema, req.params);
      const body = parseSchema(organizerActionSchema, req.body);
      const authUserId = res.locals.authUserId as number;
      requireSameUserAction(authUserId, body.organizerId);
      const tanda = tandaService.cancelTanda({
        tandaId: params.id,
        organizerId: body.organizerId,
      });
      res.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.post("/tandas/:id/contributions", authRequired, (req, res, next) => {
    try {
      const params = parseSchema(tandaIdParamSchema, req.params);
      const body = parseSchema(recordContributionSchema, req.body);
      const authUserId = res.locals.authUserId as number;
      const contribution = tandaService.recordContribution({
        tandaId: params.id,
        participantId: body.participantId,
        actorUserId: authUserId,
        isLate: body.isLate,
      });
      res.status(201).json(contribution);
    } catch (error) {
      next(error);
    }
  });

  router.get("/tandas/:id/rounds/:round", (req, res, next) => {
    try {
      const tandaParams = parseSchema(tandaIdParamSchema, req.params);
      const roundParams = parseSchema(roundParamSchema, req.params);
      const summary = tandaService.getRoundSummary({
        tandaId: tandaParams.id,
        round: roundParams.round,
      });
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  });

  router.post("/tandas/:id/advance", authRequired, (req, res, next) => {
    try {
      const params = parseSchema(tandaIdParamSchema, req.params);
      const body = parseSchema(organizerActionSchema, req.body);
      const authUserId = res.locals.authUserId as number;
      requireSameUserAction(authUserId, body.organizerId);
      const tanda = tandaService.advanceRound({
        tandaId: params.id,
        organizerId: body.organizerId,
      });
      res.status(200).json(tanda);
    } catch (error) {
      next(error);
    }
  });

  router.get("/tandas/:id/participants/:pid/history", (req, res, next) => {
    try {
      const params = parseSchema(participantHistoryParamSchema, req.params);
      const history = tandaService.getParticipantHistory({
        tandaId: params.id,
        participantId: params.pid,
      });
      res.status(200).json(history);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
