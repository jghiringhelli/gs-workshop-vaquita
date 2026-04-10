import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  userService,
  tandaService,
  participantService,
  contributionService,
} from "./services";
import { authMiddleware, generateToken } from "./middleware";
import { ValidationError } from "./errors";

/**
 * Route handlers - HTTP layer only
 * All business logic delegated to services
 */

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name required"),
});

const createTandaSchema = z.object({
  name: z.string().min(1, "Tanda name required"),
  organizerId: z.string().uuid("Invalid organizer ID"),
  contributionAmount: z.number().positive("Contribution amount must be positive"),
  totalRounds: z.number().int().positive("Total rounds must be positive").optional(),
});

const joinTandaSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

const recordContributionSchema = z.object({
  participantId: z.string().uuid("Invalid participant ID"),
  amount: z.number().positive("Amount must be positive"),
});

// Helper to parse and validate request body
const parseBody =
  <T,>(schema: z.ZodSchema<T>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req.body);
      (req as any).validatedData = data;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          if (!details[path]) details[path] = [];
          details[path].push(err.message);
        });
        throw new ValidationError("Invalid request data", details);
      }
      next(error);
    }
  };

// ============= USER ROUTES =============

router.post<{}, any, any>(
  "/api/users",
  parseBody(createUserSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name } = (req as any).validatedData;
      const user = userService.createUser(email, name);
      const token = generateToken(user.id);
      res.status(201).json({ ...user, token });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/api/users", (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/api/users/:id",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = userService.getUserById(req.params.id as string);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// ============= TANDA ROUTES =============

router.post<{}, any, any>(
  "/api/tandas",
  authMiddleware,
  parseBody(createTandaSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, organizerId, contributionAmount, totalRounds } = (req as any).validatedData;
      const tanda = tandaService.createTanda(
        name,
        organizerId,
        contributionAmount,
        totalRounds || 0
      );
      res.status(201).json(tanda);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/api/tandas", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;
    let tandas;
    if (userId) {
      tandas = tandaService.getTandasForUser(userId as string);
    } else {
      tandas = tandaService.getAllTandas();
    }
    res.json(tandas);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/api/tandas/:id",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tanda = tandaService.getTandaById(req.params.id as string);
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  }
);

router.post<any, any, any>(
  "/api/tandas/:id/join",
  authMiddleware,
  parseBody(joinTandaSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = (req as any).validatedData;
      const participant = tandaService.joinTanda(req.params.id as string, userId);
      res.status(201).json(participant);
    } catch (error) {
      next(error);
    }
  }
);

router.post<any, any, any>(
  "/api/tandas/:id/start",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizerId = req.userId;
      if (!organizerId) {
        throw new ValidationError("User not authenticated");
      }
      const tanda = tandaService.startTanda(req.params.id as string, organizerId);
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  }
);

router.post<any, any, any>(
  "/api/tandas/:id/cancel",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizerId = req.userId;
      if (!organizerId) {
        throw new ValidationError("User not authenticated");
      }
      const tanda = tandaService.cancelTanda(req.params.id as string, organizerId);
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  }
);

router.post<any, any, any>(
  "/api/tandas/:id/advance",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizerId = req.userId;
      if (!organizerId) {
        throw new ValidationError("User not authenticated");
      }
      const tanda = tandaService.advanceToNextRound(req.params.id as string, organizerId);
      res.json(tanda);
    } catch (error) {
      next(error);
    }
  }
);

// ============= PARTICIPANT ROUTES =============

router.get(
  "/api/tandas/:id/participants",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const participants = participantService.getParticipantsByTandasId(
        req.params.id as string
      );
      res.json(participants);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/tandas/:tandaId/participants/:participantId/history",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = participantService.getParticipantHistory(
        req.params.participantId as string
      );
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

// ============= CONTRIBUTION ROUTES =============

router.post<any, any, any>(
  "/api/tandas/:id/contributions",
  authMiddleware,
  parseBody(recordContributionSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { participantId, amount } = (req as any).validatedData;
      const contribution = contributionService.recordContribution(
        req.params.id as string,
        participantId,
        amount
      );
      res.status(201).json(contribution);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/tandas/:tandaId/rounds/:round",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const round = parseInt(req.params.round as string, 10);
      const summary = contributionService.getRoundSummary(
        req.params.tandaId as string,
        round
      );
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
