/**
 * Tool 1 — searchTrains. See spec/03-agent-spec.md §6.
 *
 * Finds candidate TrainAvailability records for a route/date. Never
 * accesses raw mock data directly — goes through services/. Read-only:
 * never invents results, never modifies data, never books anything.
 */

import { getTrains } from '../services/trains';
import { findAvailability } from '../services/availability';
import type { SearchRequest, TrainAvailability } from '../types/domain';

export function searchTrains(request: SearchRequest): TrainAvailability[] {
  const matchingTrainNumbers = new Set(
    getTrains()
      .filter(
        (train) =>
          train.sourceStationCode === request.sourceStationCode &&
          train.destinationStationCode === request.destinationStationCode,
      )
      .map((train) => train.number),
  );

  if (matchingTrainNumbers.size === 0) return [];

  return findAvailability({
    journeyDate: request.journeyDate,
    quota: 'GENERAL',
    travelClass: request.preferredClass,
  }).filter((availability) => matchingTrainNumbers.has(availability.trainNumber));
}
