import type { Participant } from './participant.repo';

/**
 * Assigns random rotation positions 1..N to a list of participants.
 *
 * Uses a Fisher-Yates (Knuth) shuffle to produce a uniformly random ordering.
 * Returns a new array — the input is not mutated.
 *
 * @param participants - Array of participants to shuffle.
 * @returns New array with each participant assigned a unique `rotationPosition` (1..N).
 */
export function assignRotationPositions(
  participants: ReadonlyArray<Participant>,
): Array<Participant & { rotationPosition: number }> {
  const shuffled = participants.map((p) => ({ ...p }));

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }

  return shuffled.map((p, index) => ({ ...p, rotationPosition: index + 1 }));
}
