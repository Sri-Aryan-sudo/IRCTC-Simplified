/**
 * Data access for TrainAvailability records.
 * See spec/05-technical-spec.md §8.
 *
 * Named `findAvailability`/`getAvailability` deliberately, not
 * `searchTrains` — that name is reserved for the agent tool
 * (tools/searchTrains.ts, not yet implemented) which will call
 * `findAvailability` underneath plus additional shaping. Keeping the
 * names distinct avoids two same-named functions at different layers.
 */

import { trainAvailability } from '../data';
import type { ISODate, Quota, TrainAvailability, TravelClass, TrainNumber } from '../types/domain';

export interface AvailabilitySearchCriteria {
  trainNumber?: TrainNumber;
  journeyDate?: ISODate;
  travelClass?: TravelClass;
  quota?: Quota;
}

/** One specific train/date/class/quota record, if it exists. */
export function getAvailability(
  trainNumber: TrainNumber,
  journeyDate: ISODate,
  travelClass: TravelClass,
  quota: Quota,
): TrainAvailability | undefined {
  return trainAvailability.find(
    (a) =>
      a.trainNumber === trainNumber &&
      a.journeyDate === journeyDate &&
      a.travelClass === travelClass &&
      a.quota === quota,
  );
}

/** All records matching the given (partial) criteria. */
export function findAvailability(criteria: AvailabilitySearchCriteria): TrainAvailability[] {
  return trainAvailability.filter(
    (a) =>
      (criteria.trainNumber === undefined || a.trainNumber === criteria.trainNumber) &&
      (criteria.journeyDate === undefined || a.journeyDate === criteria.journeyDate) &&
      (criteria.travelClass === undefined || a.travelClass === criteria.travelClass) &&
      (criteria.quota === undefined || a.quota === criteria.quota),
  );
}
