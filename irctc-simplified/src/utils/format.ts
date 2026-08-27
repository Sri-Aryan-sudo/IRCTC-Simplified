/**
 * Small, pure formatting helpers shared across Smart Search /
 * Results / Train Details. No i18n here — these format domain
 * values (fares, durations) which are never translated, per
 * spec/01-product-spec.md's Multilingual Experience section.
 */

/** 1240 -> "₹1,240" */
export function formatFare(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** 770 -> "12h 50m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
