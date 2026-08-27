/**
 * scripts/validateMockData.ts
 *
 * Validates the generated mock dataset in src/data/ against the data
 * contract in spec/04-data-spec.md. Fails loudly (non-zero exit,
 * every problem listed) if anything is inconsistent.
 *
 * Run: npm run validate:data
 */

import {
  stations,
  trains,
  trainAvailability,
  statusDefinitions,
  users,
  passengers,
  bookings,
  tatkalPreparations,
  tatkalAttempts,
  demoScenarios,
} from '../src/data/index.ts';
import type { AvailabilityStatusCode, Train } from '../src/types/domain.ts';

const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------

const stationCodes = new Set(stations.map((s) => s.code));
const trainByNumber = new Map<string, Train>(trains.map((t) => [t.number, t]));
const passengerIds = new Set(passengers.map((p) => p.id));
const userIds = new Set(users.map((u) => u.id));
const tatkalPrepIds = new Set(tatkalPreparations.map((p) => p.id));
const statusDefCodes = new Set(statusDefinitions.map((d) => d.code));

// ---------------------------------------------------------------------------
// Unique IDs
// ---------------------------------------------------------------------------

function checkUnique(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

checkUnique('user', users.map((u) => u.id));
checkUnique('passenger', passengers.map((p) => p.id));
checkUnique('booking', bookings.map((b) => b.id));
checkUnique('tatkalPreparation', tatkalPreparations.map((p) => p.id));
checkUnique('tatkalAttempt', tatkalAttempts.map((a) => a.id));
checkUnique('demoScenario', demoScenarios.map((s) => s.id));
checkUnique('station code', stations.map((s) => s.code));

// No duplicate train numbers
checkUnique('train number', trains.map((t) => t.number));

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

if (stations.length < 30) {
  fail(`Expected roughly 40-50 stations, found ${stations.length}`);
}

// ---------------------------------------------------------------------------
// Trains
// ---------------------------------------------------------------------------

for (const train of trains) {
  if (!stationCodes.has(train.sourceStationCode)) {
    fail(`Train ${train.number}: unknown sourceStationCode ${train.sourceStationCode}`);
  }
  if (!stationCodes.has(train.destinationStationCode)) {
    fail(`Train ${train.number}: unknown destinationStationCode ${train.destinationStationCode}`);
  }
  for (const code of train.routeStationCodes) {
    if (!stationCodes.has(code)) {
      fail(`Train ${train.number}: unknown routeStationCodes entry ${code}`);
    }
  }
  if (train.routeStationCodes[0] !== train.sourceStationCode) {
    fail(`Train ${train.number}: routeStationCodes must start with sourceStationCode`);
  }
  if (train.routeStationCodes[train.routeStationCodes.length - 1] !== train.destinationStationCode) {
    fail(`Train ${train.number}: routeStationCodes must end with destinationStationCode`);
  }
  if (train.supportedClasses.length === 0) {
    fail(`Train ${train.number}: supportedClasses must be non-empty`);
  }
  if (train.durationMinutes <= 0) {
    fail(`Train ${train.number}: durationMinutes must be positive, got ${train.durationMinutes}`);
  }
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

const WAITLIST_STATUSES: AvailabilityStatusCode[] = ['GNWL', 'PQWL', 'RLWL', 'TQWL'];
const availabilityKeys = new Set<string>();

for (const avail of trainAvailability) {
  const train = trainByNumber.get(avail.trainNumber);
  if (!train) {
    fail(`Availability references unknown train ${avail.trainNumber}`);
    continue;
  }

  if (!train.supportedClasses.includes(avail.travelClass)) {
    fail(
      `Availability for train ${avail.trainNumber}: class ${avail.travelClass} is not in that train's supportedClasses`,
    );
  }

  if (!isValidISODate(avail.journeyDate)) {
    fail(`Availability for train ${avail.trainNumber}: invalid journeyDate ${avail.journeyDate}`);
  }

  if (avail.fareAmount <= 0) {
    fail(`Availability for train ${avail.trainNumber}: fareAmount must be positive, got ${avail.fareAmount}`);
  }

  const key = `${avail.trainNumber}|${avail.journeyDate}|${avail.travelClass}|${avail.quota}`;
  if (availabilityKeys.has(key)) {
    fail(`Duplicate availability composite key: ${key}`);
  }
  availabilityKeys.add(key);

  // status/field combination rules
  const isWaitlist = WAITLIST_STATUSES.includes(avail.status);
  if (isWaitlist && avail.waitlistPosition === undefined) {
    fail(`Availability for train ${avail.trainNumber} (${avail.status}): missing waitlistPosition`);
  }
  if (!isWaitlist && avail.waitlistPosition !== undefined) {
    fail(`Availability for train ${avail.trainNumber} (${avail.status}): waitlistPosition should be absent`);
  }
  if (avail.status === 'RAC' && avail.racPosition === undefined) {
    fail(`Availability for train ${avail.trainNumber} (RAC): missing racPosition`);
  }
  if (avail.status !== 'RAC' && avail.racPosition !== undefined) {
    fail(`Availability for train ${avail.trainNumber} (${avail.status}): racPosition should be absent`);
  }
  if (avail.status === 'SOLD_OUT' && avail.confirmationLikelihood !== 0) {
    fail(`Availability for train ${avail.trainNumber} (SOLD_OUT): confirmationLikelihood must be 0`);
  }
  if (avail.status === 'CNF' && avail.confirmationLikelihood !== 1) {
    fail(`Availability for train ${avail.trainNumber} (CNF): confirmationLikelihood must be 1`);
  }
  if (avail.confirmationLikelihood < 0 || avail.confirmationLikelihood > 1) {
    fail(`Availability for train ${avail.trainNumber}: confirmationLikelihood out of [0,1] range`);
  }
  if (avail.status === 'TQWL' && avail.quota !== 'TATKAL') {
    fail(`Availability for train ${avail.trainNumber}: TQWL status must have quota TATKAL`);
  }
  if (!statusDefCodes.has(avail.status)) {
    fail(`Availability for train ${avail.trainNumber}: status ${avail.status} has no RailwayStatusDefinition`);
  }
}

// ---------------------------------------------------------------------------
// Status definitions
// ---------------------------------------------------------------------------

const REQUIRED_STATUS_CODES = ['GNWL', 'RAC', 'PQWL', 'RLWL', 'TQWL', 'WL', 'CNF', 'CAN', 'REGRET', 'SOLD_OUT'];
for (const code of REQUIRED_STATUS_CODES) {
  if (!statusDefCodes.has(code as never)) {
    fail(`Missing required RailwayStatusDefinition for code ${code}`);
  }
}

// ---------------------------------------------------------------------------
// Users / Passengers
// ---------------------------------------------------------------------------

for (const user of users) {
  for (const pid of user.savedPassengerIds) {
    if (!passengerIds.has(pid)) {
      fail(`User ${user.id}: unknown savedPassengerId ${pid}`);
    }
  }
}

for (const passenger of passengers) {
  if (passenger.age <= 0 || !Number.isInteger(passenger.age)) {
    fail(`Passenger ${passenger.id}: age must be a positive integer, got ${passenger.age}`);
  }
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

for (const booking of bookings) {
  if (!/^\d{10}$/.test(booking.pnr)) {
    fail(`Booking ${booking.id}: PNR must be a 10-digit numeric string, got ${booking.pnr}`);
  }
  if (!userIds.has(booking.userId)) {
    fail(`Booking ${booking.id}: unknown userId ${booking.userId}`);
  }
  if (!trainByNumber.has(booking.trainNumber)) {
    fail(`Booking ${booking.id}: unknown trainNumber ${booking.trainNumber}`);
  }
  if (booking.passengers.length === 0) {
    fail(`Booking ${booking.id}: passengers must be non-empty`);
  }
  for (const bp of booking.passengers) {
    if (bp.passengerId && !passengerIds.has(bp.passengerId)) {
      fail(`Booking ${booking.id}: unknown passengerId ${bp.passengerId}`);
    }
  }
}
checkUnique('booking PNR', bookings.map((b) => b.pnr));

// ---------------------------------------------------------------------------
// Tatkal
// ---------------------------------------------------------------------------

for (const prep of tatkalPreparations) {
  if (!stationCodes.has(prep.sourceStationCode)) {
    fail(`TatkalPreparation ${prep.id}: unknown sourceStationCode ${prep.sourceStationCode}`);
  }
  if (!stationCodes.has(prep.destinationStationCode)) {
    fail(`TatkalPreparation ${prep.id}: unknown destinationStationCode ${prep.destinationStationCode}`);
  }
  if (!trainByNumber.has(prep.preferredTrainNumber)) {
    fail(`TatkalPreparation ${prep.id}: unknown preferredTrainNumber ${prep.preferredTrainNumber}`);
  }
  if (prep.backupTrainNumbers.length === 0) {
    fail(`TatkalPreparation ${prep.id}: backupTrainNumbers must be non-empty (required before "ready")`);
  }
  for (const backup of prep.backupTrainNumbers) {
    if (!trainByNumber.has(backup)) {
      fail(`TatkalPreparation ${prep.id}: unknown backup train ${backup}`);
    }
  }
  if (prep.backupTrainNumbers.includes(prep.preferredTrainNumber)) {
    fail(`TatkalPreparation ${prep.id}: preferredTrainNumber must not also appear in backupTrainNumbers`);
  }
  for (const pid of prep.passengerIds) {
    if (!passengerIds.has(pid)) {
      fail(`TatkalPreparation ${prep.id}: unknown passengerId ${pid}`);
    }
  }
  if (prep.isReady && prep.backupTrainNumbers.length === 0) {
    fail(`TatkalPreparation ${prep.id}: cannot be isReady with no backups`);
  }

  // Preferred/backup trains must have a TATKAL-quota availability record
  // for this preparation's date/class (so an attempt against them is meaningful).
  const requiredTrainNumbers = [prep.preferredTrainNumber, ...prep.backupTrainNumbers];
  for (const trainNumber of requiredTrainNumbers) {
    const hasTatkalAvailability = trainAvailability.some(
      (a) =>
        a.trainNumber === trainNumber &&
        a.journeyDate === prep.journeyDate &&
        a.travelClass === prep.preferredClass &&
        a.quota === 'TATKAL',
    );
    if (!hasTatkalAvailability) {
      fail(
        `TatkalPreparation ${prep.id}: train ${trainNumber} has no TATKAL-quota availability for ${prep.journeyDate}/${prep.preferredClass}`,
      );
    }
  }
}

for (const attempt of tatkalAttempts) {
  if (!tatkalPrepIds.has(attempt.preparationId)) {
    fail(`TatkalAttempt ${attempt.id}: unknown preparationId ${attempt.preparationId}`);
  }
  if ((attempt.outcome === 'CNF' || attempt.outcome === 'RAC') && !attempt.resultingBookingId) {
    fail(`TatkalAttempt ${attempt.id}: outcome ${attempt.outcome} requires resultingBookingId`);
  }
  if (attempt.outcome === 'REGRET' && attempt.resultingBookingId) {
    fail(`TatkalAttempt ${attempt.id}: outcome REGRET must not have resultingBookingId`);
  }
}

// ---------------------------------------------------------------------------
// Demo scenarios
// ---------------------------------------------------------------------------

for (const scenario of demoScenarios) {
  const hasDriver = Boolean(scenario.searchInput || scenario.agentInputText || scenario.tatkalScenario);
  if (!hasDriver) {
    fail(`DemoScenario ${scenario.id}: must have at least one of searchInput, agentInputText, tatkalScenario`);
  }
  if (!scenario.expectedOutcome || scenario.expectedOutcome.trim().length === 0) {
    fail(`DemoScenario ${scenario.id}: expectedOutcome must be non-empty`);
  }

  if (scenario.searchInput) {
    const { sourceStationCode, destinationStationCode, passengerCount } = scenario.searchInput;
    if (!stationCodes.has(sourceStationCode)) {
      fail(`DemoScenario ${scenario.id}: unknown sourceStationCode ${sourceStationCode}`);
    }
    if (!stationCodes.has(destinationStationCode)) {
      fail(`DemoScenario ${scenario.id}: unknown destinationStationCode ${destinationStationCode}`);
    }
    if (sourceStationCode === destinationStationCode) {
      fail(`DemoScenario ${scenario.id}: source and destination must differ`);
    }
    if (passengerCount < 1) {
      fail(`DemoScenario ${scenario.id}: passengerCount must be >= 1`);
    }
  }

  for (const trainNumber of scenario.expectedTrainNumbers ?? []) {
    if (!trainByNumber.has(trainNumber)) {
      fail(`DemoScenario ${scenario.id}: unknown expectedTrainNumbers entry ${trainNumber}`);
    }
  }

  for (const rec of scenario.expectedRecommendations ?? []) {
    if (!trainByNumber.has(rec.trainNumber)) {
      fail(`DemoScenario ${scenario.id}: unknown recommendation trainNumber ${rec.trainNumber}`);
    }
  }

  for (const status of scenario.expectedStatuses ?? []) {
    const matches = trainAvailability.some(
      (a) =>
        a.trainNumber === status.trainNumber &&
        a.travelClass === status.travelClass &&
        a.status === status.status,
    );
    if (!matches) {
      fail(
        `DemoScenario ${scenario.id}: no availability record matches expected status ${status.trainNumber}/${status.travelClass}/${status.status}`,
      );
    }
  }

  if (scenario.tatkalScenario) {
    const prep = tatkalPreparations.find((p) => p.id === scenario.tatkalScenario!.preparationId);
    if (!prep) {
      fail(`DemoScenario ${scenario.id}: unknown tatkalScenario.preparationId ${scenario.tatkalScenario.preparationId}`);
    } else {
      const expectedBackupCount = scenario.tatkalScenario.expectedBackupOutcomes.length;
      if (expectedBackupCount > prep.backupTrainNumbers.length) {
        fail(
          `DemoScenario ${scenario.id}: expectedBackupOutcomes (${expectedBackupCount}) exceeds prepared backups (${prep.backupTrainNumbers.length})`,
        );
      }
      if (scenario.tatkalScenario.expectedPreferredOutcome === 'CNF' && expectedBackupCount > 0) {
        fail(`DemoScenario ${scenario.id}: preferred succeeded (CNF) but expectedBackupOutcomes is non-empty`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`\n✗ Mock data validation FAILED with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

console.log('✓ Mock data validation passed.');
console.log(`  stations:            ${stations.length}`);
console.log(`  trains:              ${trains.length}`);
console.log(`  availability:        ${trainAvailability.length}`);
console.log(`  status definitions:  ${statusDefinitions.length}`);
console.log(`  users:               ${users.length}`);
console.log(`  passengers:          ${passengers.length}`);
console.log(`  bookings:            ${bookings.length}`);
console.log(`  tatkal preparations: ${tatkalPreparations.length}`);
console.log(`  tatkal attempts:     ${tatkalAttempts.length}`);
console.log(`  demo scenarios:      ${demoScenarios.length}`);
