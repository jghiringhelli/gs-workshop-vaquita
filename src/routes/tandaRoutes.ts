// Rutas relacionadas con la gestión de tandas, participantes y contribuciones.
// Incluye creación, consulta, avance de rondas y operaciones sobre participantes y aportaciones.
import { Router, Request, Response, NextFunction } from "express";
import { tandaService } from "../services/tandaService";
import {
  createTandaSchema,
  joinTandaSchema,
  recordContributionSchema,
} from "../schemas";
import { ValidationError } from "../errors";

const router = Router();

router.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createTandaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => e.message).join(", "),
      );
    }
    const tanda = tandaService.createTanda(
      parsed.data.name,
      parsed.data.organizerId,
      parsed.data.contributionAmount,
    );
    res.status(201).json(tanda);
  } catch (err) {
    next(err);
  }
});

router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.query.userId);
    if (isNaN(userId)) {
      throw new ValidationError("userId query parameter is required");
    }
    const tandas = tandaService.listTandasForUser(userId);
    res.json(tandas);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError("Invalid tanda ID");
    }
    const tanda = tandaService.getTandaById(id);
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/join", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = Number(req.params.id);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }
    const parsed = joinTandaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => e.message).join(", "),
      );
    }
    const participant = tandaService.joinTanda(tandaId, parsed.data.userId);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/start", (req: Request, res: Response, next: NextFunction) => {
  try {
    const tandaId = Number(req.params.id);
    if (isNaN(tandaId)) {
      throw new ValidationError("Invalid tanda ID");
    }
    const { organizerId } = req.body;
    if (!organizerId) {
      throw new ValidationError("organizerId is required");
    }
    const tanda = tandaService.startTanda(tandaId, Number(organizerId));
    res.json(tanda);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/cancel",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params.id);
      if (isNaN(tandaId)) {
        throw new ValidationError("Invalid tanda ID");
      }
      const { organizerId } = req.body;
      if (!organizerId) {
        throw new ValidationError("organizerId is required");
      }
      const tanda = tandaService.cancelTanda(tandaId, Number(organizerId));
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/:id/participants",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params.id);
      if (isNaN(tandaId)) {
        throw new ValidationError("Invalid tanda ID");
      }
      const participants = tandaService.getParticipants(tandaId);
      res.json(participants);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/:id/contributions",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params.id);
      if (isNaN(tandaId)) {
        throw new ValidationError("Invalid tanda ID");
      }
      const parsed = recordContributionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.errors.map((e) => e.message).join(", "),
        );
      }
      const contribution = tandaService.recordContribution(
        tandaId,
        parsed.data.participantId,
        parsed.data.amount,
        parsed.data.status,
      );
      res.status(201).json(contribution);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/:id/rounds/:round",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params.id);
      const round = Number(req.params.round);
      if (isNaN(tandaId) || isNaN(round)) {
        throw new ValidationError("Invalid tanda ID or round number");
      }
      const summary = tandaService.getRoundSummary(tandaId, round);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/:id/advance",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params.id);
      if (isNaN(tandaId)) {
        throw new ValidationError("Invalid tanda ID");
      }
      const { organizerId } = req.body;
      if (!organizerId) {
        throw new ValidationError("organizerId is required");
      }
      const tanda = tandaService.advanceRound(tandaId, Number(organizerId));
      res.json(tanda);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/:id/participants/:pid/history",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const tandaId = Number(req.params.id);
      const pid = Number(req.params.pid);
      if (isNaN(tandaId) || isNaN(pid)) {
        throw new ValidationError("Invalid tanda ID or participant ID");
      }
      const history = tandaService.getParticipantHistory(tandaId, pid);
      res.json(history);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
