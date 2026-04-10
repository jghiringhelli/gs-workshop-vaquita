import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { tandaService } from "../services/tandaService.js";
import { participantService } from "../services/participantService.js";
import { contributionService } from "../services/contributionService.js";
import {
  createTandaSchema,
  joinTandaSchema,
  recordContributionSchema,
} from "../validators/schemas.js";
import { ValidationError } from "../errors/index.js";

const router = Router();

// POST /api/tandas — Create a tanda
router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createTandaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const tanda = tandaService.createTanda(
      parsed.data.name,
      parsed.data.organizerId,
      parsed.data.contributionAmount
    );
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas — List tandas (optional ?userId=)
router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId
      ? parseInt(req.query.userId as string, 10)
      : undefined;

    if (req.query.userId && (userId === undefined || isNaN(userId))) {
      throw new ValidationError("Invalid userId");
    }

    const tandas = tandaService.getTandas(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id — Get tanda details
router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      throw new ValidationError("Invalid tanda ID");
    }

    const tanda = tandaService.getTandaById(id);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/join — Join a tanda
router.post("/:id/join", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }

    const parsed = joinTandaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const participant = participantService.joinTanda(
      parsed.data.userId,
      tandaId
    );
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/start — Start tanda (organizer only)
router.post("/:id/start", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }

    const userId = req.body.userId;
    if (!userId || typeof userId !== "number") {
      throw new ValidationError("userId is required");
    }

    const tanda = tandaService.startTanda(tandaId, userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/cancel — Cancel tanda (organizer only)
router.post("/:id/cancel", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }

    const userId = req.body.userId;
    if (!userId || typeof userId !== "number") {
      throw new ValidationError("userId is required");
    }

    const tanda = tandaService.cancelTanda(tandaId, userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants — List participants
router.get("/:id/participants", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }

    const participants = participantService.getParticipants(tandaId);
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/contributions — Record a contribution
router.post("/:id/contributions", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }

    const parsed = recordContributionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const contribution = contributionService.recordContribution(
      tandaId,
      parsed.data.participantId,
      parsed.data.amount,
      parsed.data.isLate
    );
    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/rounds/:round — Round summary
router.get("/:id/rounds/:round", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    const round = parseInt(req.params.round as string, 10);
    if (isNaN(tandaId) || isNaN(round)) {
      throw new ValidationError("Invalid tanda ID or round number");
    }

    const summary = contributionService.getRoundSummary(tandaId, round);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// POST /api/tandas/:id/advance — Advance to next round (organizer only)
router.post("/:id/advance", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }

    const userId = req.body.userId;
    if (!userId || typeof userId !== "number") {
      throw new ValidationError("userId is required");
    }

    const tanda = tandaService.advanceRound(tandaId, userId);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

// GET /api/tandas/:id/participants/:pid/history — Contribution history
router.get("/:id/participants/:pid/history", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = parseInt(req.params.id as string, 10);
    const pid = parseInt(req.params.pid as string, 10);
    if (isNaN(tandaId) || isNaN(pid)) {
      throw new ValidationError("Invalid tanda ID or participant ID");
    }

    const history = contributionService.getParticipantHistory(tandaId, pid);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
