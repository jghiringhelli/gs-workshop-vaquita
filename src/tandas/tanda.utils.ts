/**
 * Shuffles an array using the Fisher-Yates algorithm.
 *
 * Properties:
 * - Every permutation is equally probable (unbiased).
 * - O(n) time, O(n) space (non-mutating — returns a new array).
 * - Deterministic output for a given Math.random sequence, making it testable
 *   by seeding the RNG in tests.
 *
 * @param arr - The array to shuffle (not mutated)
 * @returns A new array with the same elements in a random order
 */
export function shuffleArray<T>(arr: ReadonlyArray<T>): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Indices are within bounds by construction; ! asserts non-undefined to satisfy
    // noUncheckedIndexedAccess without a runtime cost.
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}
