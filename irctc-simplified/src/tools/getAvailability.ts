/**
 * Tool 2 — getAvailability. See spec/03-agent-spec.md §6.
 *
 * Thin, read-only passthrough to the data access layer for one
 * specific train/date/class/quota. Used by Train Details to check
 * the option's current availability fresh, rather than trusting
 * whatever Results computed a moment earlier (spec/02-ux-spec.md's
 * Train Details edge case: a status change since Results should be
 * surfaced honestly).
 */

import { getAvailability as getAvailabilityRecord } from '../services/availability';
import type { ISODate, Quota, TrainAvailability, TravelClass, TrainNumber } from '../types/domain';

export function getAvailability(
  trainNumber: TrainNumber,
  journeyDate: ISODate,
  travelClass: TravelClass,
  quota: Quota,
): TrainAvailability | undefined {
  return getAvailabilityRecord(trainNumber, journeyDate, travelClass, quota);
}
