/**
 * Tool 8 — createBooking. See spec/03-agent-spec.md §6.
 *
 * The only function in the codebase that writes a Booking record.
 * Requires a valid ApprovalToken (domain/approval.ts) — enforced at
 * the type level, not just by convention. Generates a deterministic
 * mock PNR from the current total booking count; never
 * Math.random(), never Date.now() for the identifier itself.
 */

import { createBookingRecord, getAllBookings } from '../services/bookings';
import type { ApprovalToken } from '../domain/approval';
import type {
  Booking,
  BookingPassenger,
  BookingSource,
  BookingStatus,
  ISODate,
  Quota,
  StationCode,
  TrainNumber,
  TravelClass,
} from '../types/domain';

export interface CreateBookingInput {
  source: BookingSource;
  userId: string;
  trainNumber: TrainNumber;
  journeyDate: ISODate;
  sourceStationCode: StationCode;
  destinationStationCode: StationCode;
  travelClass: TravelClass;
  quota: Quota;
  status: BookingStatus;
  fareAmount: number;
  passengers: BookingPassenger[];
}

/**
 * Deterministic mock PNR: a fixed 10-digit prefix plus the current
 * total booking count. Not a claim of a real PNR algorithm — see
 * spec/04-data-spec.md's Booking entity note. The base is chosen far
 * outside the seed data's PNR range (1000000001-1000000003) so
 * runtime PNRs never collide with the seed set.
 */
function generatePnr(): string {
  const existingCount = getAllBookings().length;
  return String(9000000001 + existingCount);
}

export function createBooking(input: CreateBookingInput, _approval: ApprovalToken): Booking {
  const pnr = generatePnr();
  const booking: Booking = {
    id: `booking_${pnr}`,
    pnr,
    source: input.source,
    userId: input.userId,
    trainNumber: input.trainNumber,
    journeyDate: input.journeyDate,
    sourceStationCode: input.sourceStationCode,
    destinationStationCode: input.destinationStationCode,
    travelClass: input.travelClass,
    quota: input.quota,
    status: input.status,
    fareAmount: input.fareAmount,
    passengers: input.passengers,
    bookedAt: new Date().toISOString(),
  };
  return createBookingRecord(booking);
}
