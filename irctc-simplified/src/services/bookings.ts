/**
 * Data access for Booking records.
 * See spec/05-technical-spec.md §8, §16.
 *
 * Bookings come from two sources, merged transparently: the small
 * static seed set in src/data/bookings.ts (currently empty — see
 * that file's own note on why), and bookings created at runtime by
 * the (not-yet-implemented) booking flow, persisted to localStorage.
 * Callers never need to know which source a given Booking came from.
 *
 * This module only persists a Booking it's given — it does not
 * generate PNRs or decide when a booking is allowed to be created.
 * That business logic belongs to tools/createBooking.ts (not part of
 * this foundation task).
 */

import { bookings as seedBookings } from '../data';
import { readJSON, writeJSON } from '../utils/storage';
import type { Booking } from '../types/domain';

const RUNTIME_BOOKINGS_KEY = 'irctc-simplified:bookings';

function getRuntimeBookings(): Booking[] {
  return readJSON<Booking[]>('local', RUNTIME_BOOKINGS_KEY) ?? [];
}

function setRuntimeBookings(bookings: Booking[]): void {
  writeJSON('local', RUNTIME_BOOKINGS_KEY, bookings);
}

function allBookings(): Booking[] {
  return [...seedBookings, ...getRuntimeBookings()];
}

/** Every booking, across all users — used only for deterministic PNR generation (tools/createBooking.ts). */
export function getAllBookings(): Booking[] {
  return allBookings();
}

/** All bookings for one user, most recent first. */
export function getBookings(userId: string): Booking[] {
  return allBookings()
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
}

export function getBooking(bookingId: string): Booking | undefined {
  return allBookings().find((b) => b.id === bookingId);
}

/**
 * Persists an already-fully-formed Booking. Does not validate
 * approval or generate a PNR — those are the calling tool's
 * responsibility (tools/createBooking.ts).
 */
export function createBookingRecord(booking: Booking): Booking {
  const current = getRuntimeBookings();
  setRuntimeBookings([...current, booking]);
  return booking;
}
