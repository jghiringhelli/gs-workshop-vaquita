import type { Contribution, ContributionStatus, Participant } from "./TandaModels";

/**
 * Calculate the penalty amount for a late contribution.
 *
 * @param amount The original contribution amount.
 * @param latePenaltyBasisPoints The penalty rate expressed in basis points.
 * @returns The penalty amount in the same integer currency unit.
 */
export function calculateLatePenalty(amount: number, latePenaltyBasisPoints: number): number {
  return Math.floor((amount * latePenaltyBasisPoints) / 10_000);
}

/**
 * Determine whether a contribution was recorded after the configured window.
 *
 * @param roundStartedAt The timestamp when the current round started.
 * @param recordedAt The timestamp when the contribution was recorded.
 * @param contributionWindowDays The allowed contribution window in days.
 * @returns True when the contribution is late, otherwise false.
 */
export function isContributionLate(
  roundStartedAt: string | null,
  recordedAt: string,
  contributionWindowDays: number,
): boolean {
  if (!roundStartedAt) {
    return false;
  }

  const roundStartTime = new Date(roundStartedAt).getTime();
  const recordedTime = new Date(recordedAt).getTime();
  const allowedWindowInMilliseconds = contributionWindowDays * 24 * 60 * 60 * 1000;
  return recordedTime - roundStartTime > allowedWindowInMilliseconds;
}

/**
 * Count consecutive missed contributions starting from the most recent status.
 *
 * @param statuses The contribution statuses in reverse chronological order.
 * @returns The number of leading missed contributions.
 */
export function countConsecutiveMisses(statuses: readonly ContributionStatus[]): number {
  let missedContributions = 0;

  for (const status of statuses) {
    if (status !== "missed") {
      break;
    }

    missedContributions += 1;
  }

  return missedContributions;
}

/**
 * Shuffle participants using Fisher-Yates.
 *
 * @param participants The participants to shuffle.
 * @param random A random number source that returns a value in [0, 1).
 * @returns A shuffled copy of the participants.
 */
export function shuffleParticipants(
  participants: readonly Participant[],
  random: () => number,
): readonly Participant[] {
  const shuffledParticipants = [...participants];

  for (let index = shuffledParticipants.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    const currentParticipant = shuffledParticipants[index];
    const targetParticipant = shuffledParticipants[targetIndex];

    if (!currentParticipant || !targetParticipant) {
      continue;
    }

    shuffledParticipants[index] = targetParticipant;
    shuffledParticipants[targetIndex] = currentParticipant;
  }

  return shuffledParticipants;
}

/**
 * Create a synthetic pending contribution for a participant without a recorded payment.
 *
 * @param participant The participant expected to contribute.
 * @param tandaId The tanda identifier.
 * @param round The round number.
 * @param amount The expected contribution amount.
 * @returns A pending contribution placeholder.
 */
export function createPendingContribution(
  participant: Participant,
  tandaId: number,
  round: number,
  amount: number,
): Contribution {
  return {
    id: null,
    tandaId,
    participantId: participant.id,
    round,
    amount,
    status: "pending",
    penaltyAmount: 0,
    recordedAt: null,
    participant,
  };
}
