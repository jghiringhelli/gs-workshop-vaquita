import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import type { TandaService } from "./tandaService";
import type { Contribution, Participant, RoundSummary, Tanda } from "./tandaTypes";

const createTandaSchema = z.object({
  name: z.string().trim().min(1).max(100),
  organizerId: z.coerce.number().int().positive(),
  contributionAmount: z.coerce.number().int().positive(),
});

const joinTandaSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const organizerActionSchema = z.object({
  organizerId: z.coerce.number().int().positive(),
});

const recordContributionSchema = z.object({
  participantId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().nonnegative(),
  recordedAt: z.string().datetime().optional(),
});

const tandaIdSchema = z.coerce.number().int().positive();
const roundSchema = z.coerce.number().int().positive();

/**
 * Create the tanda router.
 *
 * @param tandaService Tanda application service.
 * @returns Configured Express router.
 */
export function createTandaRouter(tandaService: TandaService): Router {
  const router = Router();

  router.post("/api/tandas", asyncHandler(async (request, response) => {
    const input = createTandaSchema.parse(request.body);
    response.status(201).json(presentTanda(tandaService.createTanda(input)));
  }));

  router.get("/api/tandas", asyncHandler(async (request, response) => {
    const userId = tandaIdSchema.parse(request.query.userId);
    response.json(tandaService.listTandasForUser(userId).map(presentTanda));
  }));

  router.get("/api/tandas/:id", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const tanda = tandaService.getTandaById(tandaId);
    const participants = tandaService.listParticipants(tandaId);
    response.json({
      ...presentTanda(tanda),
      currentRecipientParticipantId: getRecipientParticipantId(tanda, participants),
    });
  }));

  router.post("/api/tandas/:id/join", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const input = joinTandaSchema.parse(request.body);
    response.status(201).json(presentParticipant(tandaService.joinTanda(tandaId, input.userId)));
  }));

  router.post("/api/tandas/:id/start", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const input = organizerActionSchema.parse(request.body);
    response.json(presentTanda(tandaService.startTanda(tandaId, input.organizerId)));
  }));

  router.post("/api/tandas/:id/cancel", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const input = organizerActionSchema.parse(request.body);
    response.json(presentTanda(tandaService.cancelTanda(tandaId, input.organizerId)));
  }));

  router.get("/api/tandas/:id/participants", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    response.json(tandaService.listParticipants(tandaId).map(presentParticipant));
  }));

  router.post("/api/tandas/:id/contributions", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const input = recordContributionSchema.parse(request.body);
    response.status(201).json(
      presentContribution(
        tandaService.recordContribution(tandaId, input.participantId, input.amount, input.recordedAt),
      ),
    );
  }));

  router.get("/api/tandas/:id/rounds/:round", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const round = roundSchema.parse(request.params.round);
    response.json(presentRoundSummary(tandaService.getRoundSummary(tandaId, round)));
  }));

  router.post("/api/tandas/:id/advance", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const input = organizerActionSchema.parse(request.body);
    response.json(presentTanda(tandaService.advanceRound(tandaId, input.organizerId)));
  }));

  router.get("/api/tandas/:id/participants/:pid/history", asyncHandler(async (request, response) => {
    const tandaId = tandaIdSchema.parse(request.params.id);
    const participantId = tandaIdSchema.parse(request.params.pid);
    response.json(tandaService.getParticipantHistory(tandaId, participantId).map(presentContribution));
  }));

  return router;
}

/**
 * Present a tanda in the public HTTP shape.
 *
 * @param tanda Domain tanda object.
 * @returns Public tanda response.
 */
function presentTanda(tanda: Tanda): Record<string, number | string> {
  return {
    id: tanda.id,
    name: tanda.name,
    organizerId: tanda.organizerId,
    contributionAmount: tanda.contributionAmount,
    status: tanda.status,
    currentRound: tanda.currentRound,
    totalRounds: tanda.totalRounds,
  };
}

/**
 * Present a participant in the public HTTP shape.
 *
 * @param participant Domain participant object.
 * @returns Public participant response.
 */
function presentParticipant(participant: Participant): Record<string, boolean | number | string | null> {
  return {
    id: participant.id,
    userId: participant.userId,
    tandaId: participant.tandaId,
    role: participant.role,
    rotationPosition: participant.rotationPosition,
    isDefaulter: participant.isDefaulter,
  };
}

/**
 * Present a contribution in the public HTTP shape.
 *
 * @param contribution Domain contribution object.
 * @returns Public contribution response.
 */
function presentContribution(contribution: Contribution): Record<string, number | string> {
  return {
    id: contribution.id,
    tandaId: contribution.tandaId,
    participantId: contribution.participantId,
    round: contribution.round,
    amount: contribution.amount,
    status: contribution.status,
    penaltyAmount: contribution.penaltyAmount,
    createdAt: contribution.createdAt,
  };
}

/**
 * Present a round summary in the public HTTP shape.
 *
 * @param summary Domain round summary.
 * @returns Public round summary response.
 */
function presentRoundSummary(summary: RoundSummary): RoundSummary {
  return summary;
}

/**
 * Resolve the current round recipient from participant rotation.
 *
 * @param tanda Current tanda.
 * @param participants Tanda participants.
 * @returns Current recipient participant identifier.
 */
function getRecipientParticipantId(tanda: Tanda, participants: ReadonlyArray<Participant>): number | null {
  return participants.find(participant => participant.rotationPosition === tanda.currentRound)?.id ?? null;
}

/**
 * Wrap an Express handler so errors flow to middleware.
 *
 * @param handler Route handler to wrap.
 * @returns Wrapped request handler.
 */
function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void> | void,
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
