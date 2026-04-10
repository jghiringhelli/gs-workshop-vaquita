import type { TandasRepo } from '../repositories/tandasRepo';
import type { ParticipantsRepo } from '../repositories/participantsRepo';
import type { ContributionsRepo } from '../repositories/contributionsRepo';
import type { UsersRepo } from '../repositories/usersRepo';
import type { CreateTandaInput } from '../validation/tandas';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors';
import { config } from '../config';

function msFromDays(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function addDaysToIso(isoDate: string, days: number): string {
  return new Date(new Date(isoDate).getTime() + msFromDays(days)).toISOString();
}

export function createTandasService(
  tandasRepo: TandasRepo,
  participantsRepo: ParticipantsRepo,
  contributionsRepo: ContributionsRepo,
  usersRepo: UsersRepo,
) {
  return {
    // ── Tanda CRUD ─────────────────────────────────────────────────────────

    createTanda(organizerId: string, data: CreateTandaInput) {
      if (!usersRepo.findById(organizerId)) throw new NotFoundError('User', organizerId);

      const tanda = tandasRepo.create({ name: data.name, organizerId, contributionAmount: data.contributionAmount });
      participantsRepo.create({ userId: organizerId, tandaId: tanda.id, role: 'organizer' });
      return tandasRepo.findById(tanda.id)!;
    },

    listTandas(userId?: string) {
      return userId ? tandasRepo.findByUserId(userId) : tandasRepo.findAll();
    },

    getTanda(tandaId: string) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError('Tanda', tandaId);
      return tanda;
    },

    // ── Participants ────────────────────────────────────────────────────────

    joinTanda(tandaId: string, userId: string) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError('Tanda', tandaId);
      if (tanda.status !== 'forming')
        throw new BadRequestError(`Cannot join a tanda with status '${tanda.status}'`);

      if (participantsRepo.findByUserAndTanda(userId, tandaId))
        throw new ConflictError('User is already a participant in this tanda');

      if (participantsRepo.countByTanda(tandaId) >= config.maxParticipants)
        throw new BadRequestError(`Tanda is full (max ${config.maxParticipants} participants)`);

      if (!usersRepo.findById(userId)) throw new NotFoundError('User', userId);

      return participantsRepo.create({ userId, tandaId, role: 'member' });
    },

    getParticipants(tandaId: string) {
      if (!tandasRepo.findById(tandaId)) throw new NotFoundError('Tanda', tandaId);
      return participantsRepo.findByTandaId(tandaId);
    },

    // ── Status transitions ──────────────────────────────────────────────────

    startTanda(tandaId: string, userId: string) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError('Tanda', tandaId);

      const actor = participantsRepo.findByUserAndTanda(userId, tandaId);
      if (!actor || actor.role !== 'organizer')
        throw new ForbiddenError('Only the organizer can start the tanda');

      if (tanda.status !== 'forming')
        throw new BadRequestError(`Cannot start a tanda with status '${tanda.status}'`);

      const participants = participantsRepo.findByTandaId(tandaId);
      if (participants.length < config.minParticipants) {
        throw new BadRequestError(
          `Need at least ${config.minParticipants} participants to start (currently ${participants.length})`,
        );
      }

      // Fisher-Yates shuffle for rotation order
      const shuffled = [...participants];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      participantsRepo.updateRotationPositions(shuffled.map((p, i) => ({ id: p.id, rotationPosition: i + 1 })));

      const roundStartedAt = new Date().toISOString();
      const dueAt = addDaysToIso(roundStartedAt, config.contributionWindowDays);
      const N = participants.length;

      tandasRepo.startTanda(tandaId, N, roundStartedAt);

      // Pre-create round-1 contributions as pending
      contributionsRepo.createMany(
        participants.map((p) => ({ tandaId, participantId: p.id, round: 1, amount: tanda.contributionAmount, dueAt })),
      );

      return tandasRepo.findById(tandaId)!;
    },

    cancelTanda(tandaId: string, userId: string) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError('Tanda', tandaId);

      const actor = participantsRepo.findByUserAndTanda(userId, tandaId);
      if (!actor || actor.role !== 'organizer')
        throw new ForbiddenError('Only the organizer can cancel the tanda');

      if (tanda.status === 'completed')
        throw new BadRequestError('Cannot cancel a completed tanda');
      if (tanda.status === 'cancelled')
        throw new ConflictError('Tanda is already cancelled');

      tandasRepo.updateStatus(tandaId, 'cancelled');
      return tandasRepo.findById(tandaId)!;
    },

    // ── Contributions ───────────────────────────────────────────────────────

    /**
     * Record the authenticated user's contribution for the current round.
     *
     * Timing rules (relative to `roundStartedAt`):
     *   • ≤ CONTRIBUTION_WINDOW_DAYS  →  status=paid,  no penalty
     *   • ≤ LATE_WINDOW_DAYS          →  status=late,  amount × (1 + PENALTY_RATE)
     *   • > LATE_WINDOW_DAYS          →  window closed, 400 error (will become 'missed' on advance)
     */
    recordContribution(tandaId: string, userId: string) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError('Tanda', tandaId);
      if (tanda.status !== 'active')
        throw new BadRequestError(`Can only contribute to an active tanda (current: ${tanda.status})`);

      const participant = participantsRepo.findByUserAndTanda(userId, tandaId);
      if (!participant) throw new ForbiddenError('You are not a participant in this tanda');

      const existing = contributionsRepo.findByParticipantAndRound(participant.id, tanda.currentRound);

      if (existing?.status === 'paid' || existing?.status === 'late')
        throw new ConflictError(`Contribution for round ${tanda.currentRound} is already recorded`);
      if (existing?.status === 'missed')
        throw new BadRequestError(`The contribution window for round ${tanda.currentRound} has closed`);

      if (!tanda.roundStartedAt) throw new BadRequestError('Round has not been started properly');

      const now = new Date();
      const roundStart = new Date(tanda.roundStartedAt);
      const dueAt = new Date(roundStart.getTime() + msFromDays(config.contributionWindowDays));
      const lateAt = new Date(roundStart.getTime() + msFromDays(config.lateWindowDays));

      let status: 'paid' | 'late';
      let amount: number;

      if (now <= dueAt) {
        status = 'paid';
        amount = tanda.contributionAmount;
      } else if (now <= lateAt) {
        status = 'late';
        amount = parseFloat((tanda.contributionAmount * (1 + config.penaltyRate)).toFixed(2));
      } else {
        throw new BadRequestError(
          'The contribution window for this round has closed. ' +
            'The contribution will be marked as missed when the organizer advances the round.',
        );
      }

      const paidAt = now.toISOString();

      if (existing) {
        contributionsRepo.updateStatus(existing.id, status, amount, paidAt);
        return contributionsRepo.findByParticipantAndRound(participant.id, tanda.currentRound)!;
      }

      // On-demand creation (fallback if not pre-created)
      const c = contributionsRepo.create({
        tandaId,
        participantId: participant.id,
        round: tanda.currentRound,
        amount,
        dueAt: dueAt.toISOString(),
      });
      contributionsRepo.updateStatus(c.id, status, amount, paidAt);
      return contributionsRepo.findByParticipantAndRound(participant.id, tanda.currentRound)!;
    },

    // ── Rounds ──────────────────────────────────────────────────────────────

    getRoundSummary(tandaId: string, round: number) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError('Tanda', tandaId);
      if (tanda.totalRounds > 0 && (round < 1 || round > tanda.totalRounds))
        throw new BadRequestError(`Invalid round number: ${round}`);

      const contributions = contributionsRepo.findByTandaAndRound(tandaId, round);
      const totals = { paid: 0, late: 0, missed: 0, pending: 0, totalAmount: 0 };
      for (const c of contributions) {
        totals[c.status]++;
        if (c.status === 'paid' || c.status === 'late') totals.totalAmount += c.amount;
      }

      return { tanda, round, contributions, totals };
    },

    /**
     * Advance to the next round (organizer only).
     *
     * Before advancing:
     *   1. All remaining 'pending' contributions → 'missed'
     *   2. Defaulter flag: participant with 2+ consecutive missed → isDefaulter=true
     *   3. consecutiveMissed is reset to 0 on a paid/late contribution
     *   4. If newRound > totalRounds → tanda auto-completes
     */
    advanceRound(tandaId: string, userId: string) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError('Tanda', tandaId);

      const actor = participantsRepo.findByUserAndTanda(userId, tandaId);
      if (!actor || actor.role !== 'organizer')
        throw new ForbiddenError('Only the organizer can advance the round');

      if (tanda.status !== 'active')
        throw new BadRequestError(`Can only advance an active tanda (current: ${tanda.status})`);

      // Step 1: close pending contributions
      contributionsRepo.updatePendingToMissed(tandaId, tanda.currentRound);

      // Step 2: update defaulter flags
      const participants = participantsRepo.findByTandaId(tandaId);
      for (const p of participants) {
        const c = contributionsRepo.findByParticipantAndRound(p.id, tanda.currentRound);
        if (c?.status === 'missed') {
          const newConsec = p.consecutiveMissed + 1;
          participantsRepo.updateDefaulterStatus(p.id, newConsec >= 2, newConsec);
        } else {
          // paid or late — reset streak (keep isDefaulter flag if already set)
          participantsRepo.updateDefaulterStatus(p.id, p.isDefaulter, 0);
        }
      }

      // Step 3: advance or complete
      const newRound = tanda.currentRound + 1;
      if (newRound > tanda.totalRounds) {
        tandasRepo.completeTanda(tandaId);
        return tandasRepo.findById(tandaId)!;
      }

      const roundStartedAt = new Date().toISOString();
      const dueAt = addDaysToIso(roundStartedAt, config.contributionWindowDays);

      tandasRepo.advanceRound(tandaId, newRound, roundStartedAt);
      contributionsRepo.createMany(
        participants.map((p) => ({
          tandaId, participantId: p.id, round: newRound, amount: tanda.contributionAmount, dueAt,
        })),
      );

      return tandasRepo.findById(tandaId)!;
    },

    // ── History ─────────────────────────────────────────────────────────────

    getParticipantHistory(tandaId: string, participantId: string) {
      if (!tandasRepo.findById(tandaId)) throw new NotFoundError('Tanda', tandaId);

      const participant = participantsRepo.findById(participantId);
      if (!participant || participant.tandaId !== tandaId)
        throw new NotFoundError('Participant', participantId);

      return { participant, contributions: contributionsRepo.findByParticipant(participantId) };
    },
  };
}

export type TandasService = ReturnType<typeof createTandasService>;
