/**
 * Wraps a synchronous, deterministic computation in a short artificial
 * delay — purely cosmetic pacing for a loading state (e.g. "Finding
 * the best trains..."). The computed result is never affected by the
 * delay. See spec/05-technical-spec.md §8, §19.
 */
export function withSimulatedDelay<T>(compute: () => T, ms = 300): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(compute()), ms);
  });
}
