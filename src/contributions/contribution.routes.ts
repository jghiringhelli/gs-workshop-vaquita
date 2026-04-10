import { Router } from "express";
import { z } from "zod";
import type { ContributionService } from "./contribution.service.js";

const recordContributionSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.number().int().positive(),
});

/**
 * Mounts contribution and round routes onto an Express Router.
 * @param contributionService - The ContributionService instance to delegate to.
 * @returns Configured Express Router.
 */
export function createContributionRouter(contributionService: ContributionService): Router {
  const router = Router({ mergeParams: true });

  router.post("/:id/contributions", (req, res, next) => {
    try {
      const parsed = recordContributionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        return;
      }
      const contribution = contributionService.recordContribution(
        req.params["id"] ?? "",
        parsed.data
      );
      res.status(201).json({ data: contribution });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/rounds/:round", (req, res, next) => {
    try {
      const round = parseInt(req.params["round"] ?? "0", 10);
      if (isNaN(round) || round < 1) {
        res.status(400).json({ errors: { round: ["round must be a positive integer"] } });
        return;
      }
      const summary = contributionService.getRoundSummary(req.params["id"] ?? "", round);
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/participants/:pid/history", (req, res, next) => {
    try {
      const history = contributionService.getParticipantHistory(
        req.params["id"] ?? "",
        req.params["pid"] ?? ""
      );
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
