/**
 * Tool 4 — rankOptions. See spec/03-agent-spec.md §6 and
 * spec/05-technical-spec.md §11 (the recommended default formula,
 * decided there since both 01-product-spec.md and 03-agent-spec.md
 * explicitly deferred the exact algorithm to the technical spec).
 *
 * Produces up to four RecommendationOption records — one per
 * RecommendationCategory — from real candidate TrainAvailability
 * records. Never fabricates a category's pick when no candidate
 * exists for it in a meaningfully different way (per
 * spec/02-ux-spec.md's Results "Partial" state): if nothing is
 * confirmed, every category still returns its best honest option.
 *
 * `reasonSummary`/`tradeOffNote` are filled with canonical English
 * text, matching the pattern already established for
 * RailwayStatusDefinition (spec/05-technical-spec.md §7): the tool
 * stays language-independent per spec/03-agent-spec.md §22. The
 * display layer (Results page) uses its own i18n keys
 * (`results.reason*`) for what's actually shown on screen in the
 * selected language — these English strings are not rendered
 * directly in the UI, they exist so the tool's contract (a non-empty
 * `reasonSummary`, per spec/04-data-spec.md's validation rule) is
 * honestly satisfied for any other consumer.
 */

import { getTrains } from '../services/trains';
import type {
  RecommendationCategory,
  RecommendationOption,
  TrainAvailability,
  TravelPriority,
} from '../types/domain';

export interface RankingPreferences {
  travelPriority?: TravelPriority;
}

interface Weights {
  confirmation: number;
  price: number;
  speed: number;
}

const DEFAULT_WEIGHTS: Weights = { confirmation: 0.4, price: 0.3, speed: 0.3 };

const PRIORITY_WEIGHTS: Record<Exclude<TravelPriority, 'BALANCED'>, Weights> = {
  CONFIRMATION: { confirmation: 0.6, price: 0.2, speed: 0.2 },
  PRICE: { confirmation: 0.2, price: 0.6, speed: 0.2 },
  SPEED: { confirmation: 0.2, price: 0.2, speed: 0.6 },
};

function weightsFor(priority: TravelPriority | undefined): Weights {
  if (priority && priority !== 'BALANCED') return PRIORITY_WEIGHTS[priority];
  return DEFAULT_WEIGHTS;
}

const BOARDABLE_STATUSES = new Set(['CNF', 'RAC']);

/**
 * The ₹ difference between a non-boardable option and the cheapest
 * boardable (CNF/RAC) option in the same candidate pool, if any.
 * Exported so the Results UI can compute the same number for its own
 * translated trade-off notice, rather than duplicating this
 * arithmetic or trying to parse it back out of `tradeOffNote`'s
 * English text.
 */
export function waitlistSavingsFor(candidates: TrainAvailability[], option: TrainAvailability): number | undefined {
  if (BOARDABLE_STATUSES.has(option.status)) return undefined;
  const cheapestBoardable = candidates
    .filter((c) => BOARDABLE_STATUSES.has(c.status))
    .sort((a, b) => a.fareAmount - b.fareAmount)[0];
  if (!cheapestBoardable) return undefined;
  const savings = cheapestBoardable.fareAmount - option.fareAmount;
  return savings > 0 ? savings : undefined;
}

export function rankOptions(
  candidates: TrainAvailability[],
  preferences: RankingPreferences = {},
): RecommendationOption[] {
  if (candidates.length === 0) return [];

  const trainsByNumber = new Map(getTrains().map((train) => [train.number, train]));
  const durationOf = (c: TrainAvailability): number => trainsByNumber.get(c.trainNumber)?.durationMinutes ?? 0;

  const fares = candidates.map((c) => c.fareAmount);
  const minFare = Math.min(...fares);
  const maxFare = Math.max(...fares);
  const durations = candidates.map(durationOf);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  const priceScore = (c: TrainAvailability): number =>
    maxFare === minFare ? 1 : 1 - (c.fareAmount - minFare) / (maxFare - minFare);
  const speedScore = (c: TrainAvailability): number =>
    maxDuration === minDuration ? 1 : 1 - (durationOf(c) - minDuration) / (maxDuration - minDuration);

  const weights = weightsFor(preferences.travelPriority);
  const overallScore = (c: TrainAvailability): number =>
    weights.confirmation * c.confirmationLikelihood + weights.price * priceScore(c) + weights.speed * speedScore(c);

  // Deterministic tie-break: higher score first, then cheaper, then
  // shorter duration, then train number — never a random shuffle.
  const byOverall = [...candidates].sort(
    (a, b) =>
      overallScore(b) - overallScore(a) ||
      a.fareAmount - b.fareAmount ||
      durationOf(a) - durationOf(b) ||
      a.trainNumber.localeCompare(b.trainNumber),
  );

  // FASTEST prefers boardable (CNF/RAC) candidates — a train you
  // cannot board isn't useful for a travel-time objective — falling
  // back to the full candidate set only if nothing is boardable at
  // all (the "Partial" state still gets an honest pick).
  //
  // CHEAPEST is different on purpose: "cheapest" means the lowest
  // fare, full stop, even if that fare comes with waitlist risk — per
  // spec/01-product-spec.md's own worked example (₹700 GNWL vs
  // ₹1,100 CNF, "save ₹400 but accept waitlist risk"). It must
  // consider ALL candidates, never silently prefer a pricier
  // confirmed option just because one exists. The trade-off itself is
  // still surfaced honestly — see `waitlistSavingsFor` below and the
  // canonical status on the option itself (spec/02-ux-spec.md's
  // Status Translator pattern, rendered via StatusBadge) — "cheapest"
  // is not the same claim as "risk-free."
  const boardable = candidates.filter((c) => BOARDABLE_STATUSES.has(c.status));
  const boardablePool = boardable.length > 0 ? boardable : candidates;

  const byFastest = [...boardablePool].sort(
    (a, b) => durationOf(a) - durationOf(b) || a.fareAmount - b.fareAmount || a.trainNumber.localeCompare(b.trainNumber),
  );
  const byCheapest = [...candidates].sort(
    (a, b) => a.fareAmount - b.fareAmount || durationOf(a) - durationOf(b) || a.trainNumber.localeCompare(b.trainNumber),
  );
  const byConfirmation = [...candidates].sort(
    (a, b) =>
      b.confirmationLikelihood - a.confirmationLikelihood ||
      a.fareAmount - b.fareAmount ||
      a.trainNumber.localeCompare(b.trainNumber),
  );

  const picks: [RecommendationCategory, TrainAvailability][] = [
    ['BEST_OVERALL', byOverall[0]],
    ['FASTEST', byFastest[0]],
    ['CHEAPEST', byCheapest[0]],
    ['BEST_CONFIRMATION_CHANCE', byConfirmation[0]],
  ];

  return picks.map(([category, option]) => toRecommendationOption(category, option, candidates));
}

function toRecommendationOption(
  category: RecommendationCategory,
  option: TrainAvailability,
  allCandidates: TrainAvailability[],
): RecommendationOption {
  const base = {
    category,
    trainNumber: option.trainNumber,
    journeyDate: option.journeyDate,
    travelClass: option.travelClass,
  };

  switch (category) {
    case 'BEST_OVERALL':
      return {
        ...base,
        reasonSummary: 'Recommended because it balances price, travel time and confirmation.',
      };
    case 'FASTEST':
      return { ...base, reasonSummary: 'The fastest option on this route.' };
    case 'CHEAPEST': {
      // If the cheapest fare happens to be boardable already, there's
      // no waitlist trade-off to report — waitlistSavingsFor returns
      // undefined for a boardable `option` regardless of pool.
      const savings = waitlistSavingsFor(allCandidates, option);
      const tradeOffNote =
        savings !== undefined
          ? `Save ₹${savings} compared with a confirmed option, but you'd be on the waitlist.`
          : undefined;
      return { ...base, reasonSummary: 'The cheapest option on this route.', tradeOffNote };
    }
    case 'BEST_CONFIRMATION_CHANCE':
      return { ...base, reasonSummary: 'Your best chance of a confirmed seat on this route.' };
  }
}
