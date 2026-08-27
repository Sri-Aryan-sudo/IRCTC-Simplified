/**
 * Tool 7 — attemptBooking. See spec/03-agent-spec.md §6.
 *
 * A mock/simulated operation — never phrased to the user as
 * contacting a real railway system. Reads the current availability
 * and returns a deterministic outcome; never invents one. For the
 * normal Smart Search flow this exists mainly as a fresh
 * double-check immediately before booking (the option was already
 * confirmed available moments earlier on Train Details/Passenger
 * Review) — real, expected failure/fallback is Tatkal Mode's job
 * (not implemented here), but this guards against a genuinely stale
 * or invalid request (e.g. a hand-edited URL) rather than silently
 * creating a booking for something that isn't actually bookable.
 */

import { getAvailability } from './getAvailability';
import type { ISODate, Quota, TrainAvailability, TravelClass, TrainNumber } from '../types/domain';

export type AttemptBookingOutcome = 'CNF' | 'RAC' | 'REGRET';

export interface AttemptBookingResult {
  outcome: AttemptBookingOutcome;
  /** Present unless the record couldn't be found at all. */
  availability?: TrainAvailability;
}

export function attemptBooking(
  trainNumber: TrainNumber,
  journeyDate: ISODate,
  travelClass: TravelClass,
  quota: Quota,
): AttemptBookingResult {
  const availability = getAvailability(trainNumber, journeyDate, travelClass, quota);
  if (!availability) return { outcome: 'REGRET' };
  if (availability.status === 'CNF') return { outcome: 'CNF', availability };
  if (availability.status === 'RAC') return { outcome: 'RAC', availability };
  return { outcome: 'REGRET', availability };
}
