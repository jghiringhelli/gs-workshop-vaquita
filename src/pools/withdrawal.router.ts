import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { withdrawalService } from "./withdrawal.service";

const router = Router();

const voteSchema = z.object({
  vote: z.enum(["approve", "reject"]),
});

/** POST /api/withdrawals/:id/vote — member votes on a withdrawal */
router.post("/:id/vote", authenticate, async (req, res, next) => {
  try {
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? "vote must be 'approve' or 'reject'" });
      return;
    }
    const voteValue = parsed.data.vote.toUpperCase() as "APPROVE" | "REJECT";
    await withdrawalService.vote(req.params.id, req.user!.sub, voteValue);
    res.status(200).json({ message: "Vote recorded" });
  } catch (err) {
    next(err);
  }
});

export { router as withdrawalRouter };
