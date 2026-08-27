/**
 * Tool 5 — getAlternatives. See spec/03-agent-spec.md §6.
 *
 * Finds alternative options when the preferred/recommended option is
 * unavailable or declined. Read-only: re-runs searchTrains + rankOptions
 * over the same hard constraints (route, date — spec's own phrase for
 * what an alternative must still satisfy) as the original intent or
 * Tatkal preparation, then excludes the failed/declined train. Class
 * is deliberately NOT re-applied as a filter here: it's a stated
 * preference for the primary recommendation, not a hard constraint,
 * and alternatives exist specifically to surface honest trade-offs
 * (e.g. a pricier confirmed seat in a different class) — narrowing
 * to the same class would hide exactly that. Never invents an
 * alternative that doesn't satisfy the real hard constraints.
 */

import { searchTrains } from './searchTrains';
import { rankOptions } from './rankOptions';
import type { AgentIntent, RecommendationOption, TatkalPreparation, TrainNumber } from '../types/domain';

function isTatkalPreparation(
  source: AgentIntent | TatkalPreparation,
): source is TatkalPreparation {
  return 'preferredTrainNumber' in source;
}

export function getAlternatives(
  source: AgentIntent | TatkalPreparation,
  excludeTrainNumber: TrainNumber,
): RecommendationOption[] {
  const request = isTatkalPreparation(source)
    ? {
        sourceStationCode: source.sourceStationCode,
        destinationStationCode: source.destinationStationCode,
        journeyDate: source.journeyDate,
        passengerCount: source.passengerIds.length || 1,
      }
    : {
        sourceStationCode: source.sourceStationCode ?? '',
        destinationStationCode: source.destinationStationCode ?? '',
        journeyDate: source.resolvedDate ?? '',
        passengerCount: source.passengerCount ?? 1,
      };

  if (!request.sourceStationCode || !request.destinationStationCode || !request.journeyDate) {
    return [];
  }

  const candidates = searchTrains(request).filter((c) => c.trainNumber !== excludeTrainNumber);
  if (candidates.length === 0) return [];

  return rankOptions(candidates, {
    travelPriority: isTatkalPreparation(source) ? undefined : priorityFromIntent(source),
  });
}

function priorityFromIntent(intent: AgentIntent): 'PRICE' | 'SPEED' | 'CONFIRMATION' | 'BALANCED' | undefined {
  if (intent.confirmationPreference === 'MUST_BE_CONFIRMED' || intent.confirmationPreference === 'PREFER_CONFIRMED') {
    return 'CONFIRMATION';
  }
  if (intent.pricePreference === 'CHEAPEST') return 'PRICE';
  if (intent.speedPreference === 'FASTEST') return 'SPEED';
  return 'BALANCED';
}
