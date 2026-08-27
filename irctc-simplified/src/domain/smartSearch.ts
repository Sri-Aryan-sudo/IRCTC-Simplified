/**
 * Smart Search orchestration. See spec/05-technical-spec.md §11.
 *
 * Pure and deterministic: `runSmartSearch` is a function of
 * `SearchRequest` + the static mock dataset — nothing here is
 * persisted separately. Results calls this on every render
 * (recomputed from the URL-decoded SearchRequest), so there is no
 * separate "recommendation state" to keep in sync or go stale.
 */

import { searchTrains } from '../tools/searchTrains';
import { rankOptions, waitlistSavingsFor } from '../tools/rankOptions';
import type { RecommendationOption, SearchRequest, SearchResult, TrainAvailability } from '../types/domain';

export { waitlistSavingsFor };

function availabilityKey(a: Pick<TrainAvailability, 'trainNumber' | 'journeyDate' | 'travelClass' | 'quota'>): string {
  return `${a.trainNumber}|${a.journeyDate}|${a.travelClass}|${a.quota}`;
}

function optionKey(o: RecommendationOption): string {
  return `${o.trainNumber}|${o.journeyDate}|${o.travelClass}|GENERAL`;
}

export interface SmartSearchOutcome {
  result: SearchResult;
  /**
   * The full candidate pool (all matching TrainAvailability records,
   * including the ones featured in `result.recommendations`). The
   * locked `SearchResult`/`RecommendationOption` shapes
   * (spec/04-data-spec.md) don't carry full availability detail
   * (status, fare, confirmationLikelihood) on a recommendation —
   * this lets the UI look that detail up for every recommendation
   * card without a second network-shaped round trip (it's all
   * synchronous anyway) or duplicating the search.
   */
  candidates: TrainAvailability[];
}

export function runSmartSearch(request: SearchRequest): SmartSearchOutcome {
  const candidates = searchTrains(request);
  const recommendations = rankOptions(candidates, { travelPriority: request.travelPriority });

  const featuredKeys = new Set(recommendations.map(optionKey));
  const moreOptions = candidates.filter((c) => !featuredKeys.has(availabilityKey(c)));

  return { result: { request, recommendations, moreOptions }, candidates };
}

/** Full TrainAvailability for a given RecommendationOption, from the candidate pool. */
export function availabilityForOption(
  candidates: TrainAvailability[],
  option: RecommendationOption,
): TrainAvailability | undefined {
  return candidates.find((c) => optionKey(option) === availabilityKey(c));
}

/**
 * True when two or more recommendation categories point at the exact
 * same train/class — spec/02-ux-spec.md's Results screen requires
 * this to be stated plainly, never presented as if they were
 * meaningfully different choices.
 */
export function collapsedCategoriesFor(
  recommendations: RecommendationOption[],
  target: RecommendationOption,
): RecommendationOption['category'][] {
  return recommendations
    .filter((r) => r.category !== target.category && optionKey(r) === optionKey(target))
    .map((r) => r.category);
}
