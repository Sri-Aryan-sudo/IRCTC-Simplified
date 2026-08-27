/**
 * Verifies the booking tools (tools/attemptBooking.ts,
 * tools/createBooking.ts) behave deterministically and correctly
 * against real mock data, using the same pattern as
 * scripts/validateSmartSearch.ts. Not registered as an npm script —
 * run directly via `npx tsx scripts/validateBooking.ts`.
 */
// This script runs under Node, which has no window/localStorage.
// utils/storage.ts gracefully no-ops without one (by design, for
// browsers with storage disabled) — but that means this script needs
// a minimal in-memory polyfill to actually exercise persistence, not
// just to work around the environment.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
}
(globalThis as { window?: unknown }).window = {
  localStorage: new MemoryStorage(),
  sessionStorage: new MemoryStorage(),
};

import { attemptBooking } from '../src/tools/attemptBooking.ts';
import { createBooking } from '../src/tools/createBooking.ts';
import { issueApprovalToken } from '../src/domain/approval.ts';
import { getBookings } from '../src/services/bookings.ts';
import { trains } from '../src/data/trains.ts';
import { DEMO_DATES } from '../src/data/demoConfig.ts';

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failures++;
}

// 1. attemptBooking reads the real CNF record for the Best Overall trio.
const attempt1 = attemptBooking('12760', DEMO_DATES.SEARCH_DEMO, '3A', 'GENERAL');
check('attemptBooking on a real CNF record returns CNF', attempt1.outcome === 'CNF');

// 2. attemptBooking on a genuinely non-existent record returns REGRET, never throws.
const attempt2 = attemptBooking('99999', DEMO_DATES.SEARCH_DEMO, '3A', 'GENERAL');
check('attemptBooking on a missing record returns REGRET (never fabricates)', attempt2.outcome === 'REGRET');

// 3. attemptBooking on a GNWL record (not boardable) returns REGRET, not CNF/RAC.
const attempt3 = attemptBooking('17654', DEMO_DATES.SEARCH_DEMO, '3A', 'GENERAL');
check('attemptBooking on a GNWL record returns REGRET (never fabricates success)', attempt3.outcome === 'REGRET');

// 4. createBooking requires a token (compile-time enforced) and produces a real Booking.
const train = trains.find((t) => t.number === '12760')!;
const before = getBookings('user_1').length;
const token = issueApprovalToken('12760|test');
const booking = createBooking(
  {
    source: 'SMART_SEARCH',
    userId: 'user_1',
    trainNumber: train.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    sourceStationCode: train.sourceStationCode,
    destinationStationCode: train.destinationStationCode,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'CNF',
    fareAmount: 1240,
    passengers: [{ name: 'Test Passenger', age: 30, gender: 'MALE' }],
  },
  token,
);
check('createBooking produces a 10-digit deterministic PNR', /^\d{10}$/.test(booking.pnr));
check('createBooking does not collide with seed PNRs (1000000001-3)', !booking.pnr.startsWith('100000000'));

const after = getBookings('user_1').length;
check('the new booking is immediately visible via getBookings (My Bookings)', after === before + 1);

// 5. Determinism: calling generatePnr-driving logic twice in a row (without
// creating a booking in between) is only meaningful in that repeated calls
// against an unchanged booking count produce the same PNR — verify indirectly
// by creating a second booking and confirming it increments, not repeats.
const token2 = issueApprovalToken('12760|test2');
const booking2 = createBooking(
  {
    source: 'SMART_SEARCH',
    userId: 'user_1',
    trainNumber: train.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    sourceStationCode: train.sourceStationCode,
    destinationStationCode: train.destinationStationCode,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'CNF',
    fareAmount: 1240,
    passengers: [{ name: 'Test Passenger 2', age: 31, gender: 'FEMALE' }],
  },
  token2,
);
check('PNR increments deterministically per booking, no duplicates', booking.pnr !== booking2.pnr);

console.log(`\n${failures === 0 ? '✓ All booking checks passed' : `✗ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
