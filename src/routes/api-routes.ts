import { Router } from "express";
import { z } from "zod";

import { getConfig } from "../config/env";
import { UserRepository } from "../repositories/user-repository";
import { TandaRepository } from "../repositories/tanda-repository";
import { ParticipantRepository } from "../repositories/participant-repository";
import { HealthRepository } from "../repositories/health-repository";
import { HealthService } from "../services/health-service";
import { UserService } from "../services/user-service";
import { TandaService } from "../services/tanda-service";
import { parseSchema } from "./validation";

const router = Router();

const config = getConfig();
const healthRepository = new HealthRepository();
const healthService = new HealthService(healthRepository, config);
const userRepository = new UserRepository();
const tandaRepository = new TandaRepository();
const participantRepository = new ParticipantRepository();

const userService = new UserService(userRepository);
const tandaService = new TandaService(
  tandaRepository,
  userRepository,
  participantRepository
);

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

router.get("/health", (_req, res) => {
  const payload = healthService.getHealth();
  res.status(200).json(payload);
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

router.post("/tandas", (req, res, next) => {
  try {
    const body = parseSchema(createTandaSchema, req.body);
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

export { router as apiRoutes };
