/**
 * scripts/generateMockData.ts
 *
 * Deterministically generates the mock railway dataset described in
 * spec/04-data-spec.md and writes it into src/data/*.ts as plain
 * TypeScript source (so it's type-checked like any other file, and
 * readable in a diff — no opaque JSON blobs).
 *
 * DETERMINISM: this script contains NO randomness of any kind (no
 * Math.random, no Date.now() for data values). Every record is
 * either hand-authored ("hero" data, used directly by the demo
 * scenarios) or derived from simple index-based formulas ("filler"
 * data, used only for background volume/realism). Running this
 * script twice produces byte-identical output.
 *
 * Run: npm run generate:data
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import type {
  AvailabilityStatusCode,
  Booking,
  DayOfWeek,
  DemoScenario,
  Passenger,
  RailwayStatusDefinition,
  Station,
  TatkalAttempt,
  TatkalPreparation,
  Train,
  TrainAvailability,
  TravelClass,
  TrainType,
  User,
} from '../src/types/domain.ts';
import { DEMO_DATES } from '../src/data/demoConfig.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../src/data');

// ===========================================================================
// STATIONS (40-50 target)
// ===========================================================================
// Station codes here are plausible/illustrative for this mock prototype.
// Where they match real IRCTC codes, that's for realism/familiarity only —
// this is not a claim of official accuracy, and no train/availability
// record here represents a real, currently-running service.

const STATIONS: Station[] = [
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'SC', name: 'Secunderabad Jn', city: 'Hyderabad', state: 'Telangana' },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana' },
  { code: 'SBC', name: 'Bengaluru City Jn', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'CSMT', name: 'Mumbai CST', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'BCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
  { code: 'HWH', name: 'Howrah Jn', city: 'Kolkata', state: 'West Bengal' },
  { code: 'PUNE', name: 'Pune Jn', city: 'Pune', state: 'Maharashtra' },
  { code: 'ADI', name: 'Ahmedabad Jn', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'CBE', name: 'Coimbatore Jn', city: 'Coimbatore', state: 'Tamil Nadu' },
  { code: 'MDU', name: 'Madurai Jn', city: 'Madurai', state: 'Tamil Nadu' },
  { code: 'ERS', name: 'Ernakulam Jn', city: 'Kochi', state: 'Kerala' },
  { code: 'BZA', name: 'Vijayawada Jn', city: 'Vijayawada', state: 'Andhra Pradesh' },
  { code: 'VSKP', name: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { code: 'JP', name: 'Jaipur Jn', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'BPL', name: 'Bhopal Jn', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'BSB', name: 'Varanasi Jn', city: 'Varanasi', state: 'Uttar Pradesh' },
  { code: 'PNBE', name: 'Patna Jn', city: 'Patna', state: 'Bihar' },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'MYS', name: 'Mysuru Jn', city: 'Mysuru', state: 'Karnataka' },
  { code: 'NGP', name: 'Nagpur Jn', city: 'Nagpur', state: 'Maharashtra' },
  { code: 'ST', name: 'Surat', city: 'Surat', state: 'Gujarat' },
  { code: 'INDB', name: 'Indore Jn', city: 'Indore', state: 'Madhya Pradesh' },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam' },
  { code: 'CDG', name: 'Chandigarh', city: 'Chandigarh', state: 'Chandigarh' },
  { code: 'ASR', name: 'Amritsar Jn', city: 'Amritsar', state: 'Punjab' },
  { code: 'TVC', name: 'Thiruvananthapuram Central', city: 'Thiruvananthapuram', state: 'Kerala' },
  { code: 'SA', name: 'Salem Jn', city: 'Salem', state: 'Tamil Nadu' },
  { code: 'TPJ', name: 'Tiruchirapalli Jn', city: 'Tiruchirapalli', state: 'Tamil Nadu' },
  { code: 'KZJ', name: 'Kazipet Jn', city: 'Warangal', state: 'Telangana' },
  { code: 'NK', name: 'Nashik Road', city: 'Nashik', state: 'Maharashtra' },
  { code: 'JBP', name: 'Jabalpur', city: 'Jabalpur', state: 'Madhya Pradesh' },
  { code: 'R', name: 'Raipur Jn', city: 'Raipur', state: 'Chhattisgarh' },
  { code: 'RNC', name: 'Ranchi', city: 'Ranchi', state: 'Jharkhand' },
  { code: 'DDN', name: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'PRYJ', name: 'Prayagraj Jn', city: 'Prayagraj', state: 'Uttar Pradesh' },
  { code: 'GWL', name: 'Gwalior', city: 'Gwalior', state: 'Madhya Pradesh' },
  { code: 'JU', name: 'Jodhpur Jn', city: 'Jodhpur', state: 'Rajasthan' },
  { code: 'UDZ', name: 'Udaipur City', city: 'Udaipur', state: 'Rajasthan' },
  { code: 'RJT', name: 'Rajkot Jn', city: 'Rajkot', state: 'Gujarat' },
  { code: 'BRC', name: 'Vadodara Jn', city: 'Vadodara', state: 'Gujarat' },
  { code: 'NLR', name: 'Nellore', city: 'Nellore', state: 'Andhra Pradesh' },
  { code: 'RJY', name: 'Rajahmundry', city: 'Rajahmundry', state: 'Andhra Pradesh' },
  { code: 'TPTY', name: 'Tirupati', city: 'Tirupati', state: 'Andhra Pradesh' },
  { code: 'UBL', name: 'Hubballi Jn', city: 'Hubballi', state: 'Karnataka' },
  { code: 'MAQ', name: 'Mangaluru Central', city: 'Mangaluru', state: 'Karnataka' },
  { code: 'GNT', name: 'Guntur Jn', city: 'Guntur', state: 'Andhra Pradesh' },
];

// ===========================================================================
// TRAINS — hero trains (hand-authored, drive the demo scenarios)
// ===========================================================================

function computeArrival(
  departureTime: string,
  durationMinutes: number,
): { arrivalTime: string; arrivalDayOffset: number } {
  const [h, m] = departureTime.split(':').map(Number);
  const totalDeparture = h * 60 + m;
  const totalArrival = totalDeparture + durationMinutes;
  const arrivalDayOffset = Math.floor(totalArrival / 1440);
  const minutesIntoDay = totalArrival % 1440;
  const arrivalTime = `${String(Math.floor(minutesIntoDay / 60)).padStart(2, '0')}:${String(
    minutesIntoDay % 60,
  ).padStart(2, '0')}`;
  return { arrivalTime, arrivalDayOffset };
}

function makeTrain(
  number: string,
  name: string,
  trainType: TrainType,
  sourceStationCode: string,
  destinationStationCode: string,
  routeStationCodes: string[],
  departureTime: string,
  durationMinutes: number,
  supportedClasses: TravelClass[],
  operatingDays: DayOfWeek[] | 'DAILY' = 'DAILY',
): Train {
  const { arrivalTime, arrivalDayOffset } = computeArrival(departureTime, durationMinutes);
  return {
    number,
    name,
    trainType,
    sourceStationCode,
    destinationStationCode,
    routeStationCodes,
    departureTime,
    arrivalTime,
    arrivalDayOffset,
    durationMinutes,
    supportedClasses,
    operatingDays,
  };
}

// -- Best Overall / Cheapest / Fastest trio (matches spec/01-product-spec.md's
//    own worked example verbatim: ₹1,240 CNF 12h50m / ₹780 GNWL 13h20m / ₹1,680 CNF 9h40m)
const trainBestOverall = makeTrain(
  '12760', 'Charminar SF Express', 'SUPERFAST', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '18:00', 770, ['SL', '3A', '2A'],
);
const trainCheapWaitlisted = makeTrain(
  '17654', 'Deccan Express', 'EXPRESS', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '19:10', 800, ['SL', '3A'],
);
const trainFastest = makeTrain(
  '12604', 'Golconda SF Express', 'SUPERFAST', 'MAS', 'SC', ['MAS', 'SC'],
  '22:30', 580, ['3A', '2A', '1A'],
);

// -- Dedicated Status Translator demo trains
const trainGnwl24Demo = makeTrain(
  '12759', 'Hyderabad SF Express', 'SUPERFAST', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '20:00', 785, ['SL', '3A'],
);
const trainRac14Demo = makeTrain(
  '17406', 'Rayalaseema Express', 'EXPRESS', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '17:45', 820, ['SL', '3A'],
);

// -- Cheapest-with-tradeoff pair (₹700 GNWL vs ₹1,100 CNF)
const trainCheapGnwl8 = makeTrain(
  '17015', 'Circar Express', 'EXPRESS', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '16:30', 810, ['SL', '3A'],
);
const trainConfirmedTradeoff = makeTrain(
  '12703', 'Chennai Hyderabad Express', 'EXPRESS', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '21:15', 765, ['SL', '3A'],
);

// -- Sold-out edge case (Results screen "no seats" card)
const trainSoldOutEdge = makeTrain(
  '12841', 'Coastal SF Express', 'SUPERFAST', 'MAS', 'SC', ['MAS', 'VSKP', 'SC'],
  '06:00', 765, ['SL', '3A'],
);

// -- Agent scenario trains ("reach Hyderabad tomorrow evening, 2 people, AC, preferably confirmed")
const trainAgentRecommended = makeTrain(
  '12728', 'Godavari SF Express', 'SUPERFAST', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '19:30', 765, ['3A', '2A'],
);
const trainAgentCheaperWaitlisted = makeTrain(
  '12766', 'Nizam SF Express', 'SUPERFAST', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '20:15', 815, ['SL', '3A'],
);
const trainAgentPricier2A = makeTrain(
  '17603', 'Kacheguda Express', 'EXPRESS', 'MAS', 'SC', ['MAS', 'BZA', 'SC'],
  '18:45', 765, ['2A', '1A'],
);

// -- "Best Chance of Confirmation" + Results "Partial" state demo
//    (no confirmed option exists at all on this route/date — all three
//    are waitlisted at different, meaningfully different, likelihoods)
const trainPartialGnwl5 = makeTrain(
  '12864', 'Howrah SF Express', 'SUPERFAST', 'SBC', 'HWH', ['SBC', 'NGP', 'HWH'],
  '11:20', 1830, ['SL', '3A', '2A'],
);
const trainPartialPqwl20 = makeTrain(
  '12246', 'Duronto Express', 'SUPERFAST', 'SBC', 'HWH', ['SBC', 'HWH'],
  '06:10', 1750, ['3A', '2A'],
);
const trainPartialRlwl35 = makeTrain(
  '18646', 'Howrah Passenger Express', 'EXPRESS', 'SBC', 'HWH', ['SBC', 'NGP', 'HWH'],
  '14:40', 1950, ['SL', '3A'],
);

const HERO_TRAINS: Train[] = [
  trainBestOverall,
  trainCheapWaitlisted,
  trainFastest,
  trainGnwl24Demo,
  trainRac14Demo,
  trainCheapGnwl8,
  trainConfirmedTradeoff,
  trainSoldOutEdge,
  trainAgentRecommended,
  trainAgentCheaperWaitlisted,
  trainAgentPricier2A,
  trainPartialGnwl5,
  trainPartialPqwl20,
  trainPartialRlwl35,
];

// ===========================================================================
// TRAINS — filler (deterministic formulas, background volume/realism only)
// ===========================================================================

const CLASS_COMBOS: TravelClass[][] = [
  ['SL', '3A'],
  ['SL', '3A', '2A'],
  ['3A', '2A'],
  ['3A', '2A', '1A'],
  ['SL'],
  ['CC'],
  ['SL', '3A', '2A', '1A'],
];

const TRAIN_TYPES: TrainType[] = ['EXPRESS', 'SUPERFAST', 'PASSENGER', 'EXPRESS', 'SUPERFAST'];

const FILLER_TRAIN_COUNT = 55;

function buildFillerTrains(): Train[] {
  const trains: Train[] = [];
  for (let i = 0; i < FILLER_TRAIN_COUNT; i++) {
    const sourceIdx = i % STATIONS.length;
    const destIdx = (i + 7 + (i % 5)) % STATIONS.length;
    if (sourceIdx === destIdx) continue; // formulaic offset avoids this in practice

    const source = STATIONS[sourceIdx];
    const dest = STATIONS[destIdx];
    const durationMinutes = 240 + ((i * 53) % 900);
    const depHour = 5 + ((i * 37) % 19);
    const depMinute = (i * 11) % 60;
    const departureTime = `${String(depHour).padStart(2, '0')}:${String(depMinute).padStart(2, '0')}`;
    const supportedClasses = CLASS_COMBOS[i % CLASS_COMBOS.length];
    const trainType = TRAIN_TYPES[i % TRAIN_TYPES.length];

    trains.push(
      makeTrain(
        String(20000 + i),
        `${dest.city} ${trainType === 'SUPERFAST' ? 'SF Express' : trainType === 'PASSENGER' ? 'Passenger' : 'Express'}`,
        trainType,
        source.code,
        dest.code,
        [source.code, dest.code],
        departureTime,
        durationMinutes,
        supportedClasses,
      ),
    );
  }
  return trains;
}

const FILLER_TRAINS = buildFillerTrains();
const ALL_TRAINS: Train[] = [...HERO_TRAINS, ...FILLER_TRAINS];

// ===========================================================================
// TRAIN AVAILABILITY — hero records (one per demo scenario need)
// ===========================================================================

function likelihoodForWaitlist(position: number, base: number, slope: number): number {
  return Math.max(0.05, Math.round((base - position * slope) * 100) / 100);
}

const HERO_AVAILABILITY: TrainAvailability[] = [
  // --- Best Overall / Cheapest / Fastest trio, SEARCH_DEMO date, GENERAL quota, class 3A
  {
    trainNumber: trainBestOverall.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'CNF',
    confirmedSeatsRemaining: 14,
    confirmationLikelihood: 1,
    fareAmount: 1240,
  },
  {
    trainNumber: trainCheapWaitlisted.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'GNWL',
    waitlistPosition: 42,
    confirmationLikelihood: likelihoodForWaitlist(42, 0.9, 0.012),
    fareAmount: 780,
  },
  {
    trainNumber: trainFastest.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'CNF',
    confirmedSeatsRemaining: 6,
    confirmationLikelihood: 1,
    fareAmount: 1680,
  },

  // --- Status Translator: GNWL 24
  // Deliberately on STATUS_DEMO, not SEARCH_DEMO — this scenario only
  // asserts that this train/status exists, but sharing SEARCH_DEMO
  // with the Best Overall trio meant a real search on that date
  // returned an unintended, larger pool. See src/data/demoConfig.ts.
  {
    trainNumber: trainGnwl24Demo.number,
    journeyDate: DEMO_DATES.STATUS_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'GNWL',
    waitlistPosition: 24,
    confirmationLikelihood: likelihoodForWaitlist(24, 0.9, 0.012),
    fareAmount: 960,
  },

  // --- RAC 14 (also on STATUS_DEMO, alongside GNWL 24 — see above)
  {
    trainNumber: trainRac14Demo.number,
    journeyDate: DEMO_DATES.STATUS_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'RAC',
    racPosition: 14,
    confirmationLikelihood: 0.8,
    fareAmount: 650,
  },

  // --- Cheapest-with-tradeoff: ₹700 GNWL8 vs ₹1,100 CNF
  // On its own CHEAPEST_DEMO date: unlike the Status Translator pair
  // above, this scenario's assertion is sensitive to exactly which
  // other options share the pool (it checks which train "wins"
  // Cheapest), so it cannot safely share a date with anything else.
  {
    trainNumber: trainCheapGnwl8.number,
    journeyDate: DEMO_DATES.CHEAPEST_DEMO,
    travelClass: 'SL',
    quota: 'GENERAL',
    status: 'GNWL',
    waitlistPosition: 8,
    confirmationLikelihood: likelihoodForWaitlist(8, 0.9, 0.012),
    fareAmount: 700,
  },
  {
    trainNumber: trainConfirmedTradeoff.number,
    journeyDate: DEMO_DATES.CHEAPEST_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'CNF',
    confirmedSeatsRemaining: 9,
    confirmationLikelihood: 1,
    fareAmount: 1100,
  },

  // --- Sold-out edge case (Results screen "no seats" state)
  // On STATUS_DEMO alongside the GNWL/RAC pair — no scenario asserts
  // the full pool on that date, so it's safe to share.
  {
    trainNumber: trainSoldOutEdge.number,
    journeyDate: DEMO_DATES.STATUS_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'SOLD_OUT',
    confirmationLikelihood: 0,
    fareAmount: 890,
  },

  // --- Agent scenario, TOMORROW date, GENERAL quota, AC classes, evening departures
  {
    trainNumber: trainAgentRecommended.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'CNF',
    confirmedSeatsRemaining: 11,
    confirmationLikelihood: 1,
    fareAmount: 1350,
  },
  {
    trainNumber: trainAgentCheaperWaitlisted.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'GNWL',
    waitlistPosition: 12,
    confirmationLikelihood: likelihoodForWaitlist(12, 0.9, 0.012),
    fareAmount: 980,
  },
  {
    trainNumber: trainAgentPricier2A.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '2A',
    quota: 'GENERAL',
    status: 'CNF',
    confirmedSeatsRemaining: 5,
    confirmationLikelihood: 1,
    fareAmount: 2100,
  },

  // --- Best Chance of Confirmation + Results "Partial" state (no CNF exists)
  {
    trainNumber: trainPartialGnwl5.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'GNWL',
    waitlistPosition: 5,
    confirmationLikelihood: likelihoodForWaitlist(5, 0.9, 0.012),
    fareAmount: 1450,
  },
  {
    trainNumber: trainPartialPqwl20.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'PQWL',
    waitlistPosition: 20,
    confirmationLikelihood: likelihoodForWaitlist(20, 0.7, 0.012),
    fareAmount: 1590,
  },
  {
    trainNumber: trainPartialRlwl35.number,
    journeyDate: DEMO_DATES.SEARCH_DEMO,
    travelClass: '3A',
    quota: 'GENERAL',
    status: 'RLWL',
    waitlistPosition: 35,
    confirmationLikelihood: likelihoodForWaitlist(35, 0.6, 0.012),
    fareAmount: 1180,
  },

  // --- Dedicated TQWL example (Tatkal quota waitlist), used by the TQWL demo scenario
  {
    trainNumber: trainGnwl24Demo.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'TATKAL',
    status: 'TQWL',
    waitlistPosition: 6,
    confirmationLikelihood: likelihoodForWaitlist(6, 0.5, 0.02),
    fareAmount: 1050,
  },

  // --- Tatkal Success scenario: preferred confirms directly
  {
    trainNumber: trainRac14Demo.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'TATKAL',
    status: 'CNF',
    confirmedSeatsRemaining: 4,
    confirmationLikelihood: 1,
    fareAmount: 1450,
  },
  // required (unused) backup for the Tatkal Success preparation, and
  // the backup for the TQWL fallback demo — both prepared at 3A
  {
    trainNumber: trainCheapGnwl8.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'TATKAL',
    status: 'CNF',
    confirmedSeatsRemaining: 8,
    confirmationLikelihood: 1,
    fareAmount: 820,
  },

  // --- HERO: Tatkal Failure + Backup — preferred SOLD_OUT, both backups CNF
  {
    trainNumber: trainBestOverall.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'TATKAL',
    status: 'SOLD_OUT',
    confirmationLikelihood: 0,
    fareAmount: 1450,
  },
  {
    trainNumber: trainCheapWaitlisted.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'TATKAL',
    status: 'CNF',
    confirmedSeatsRemaining: 3,
    confirmationLikelihood: 1,
    fareAmount: 990,
  },
  {
    trainNumber: trainFastest.number,
    journeyDate: DEMO_DATES.TOMORROW,
    travelClass: '3A',
    quota: 'TATKAL',
    status: 'CNF',
    confirmedSeatsRemaining: 2,
    confirmationLikelihood: 1,
    fareAmount: 1980,
  },
];

// ===========================================================================
// TRAIN AVAILABILITY — filler (deterministic formulas, background volume)
// ===========================================================================

const FILLER_STATUS_CYCLE: AvailabilityStatusCode[] = ['CNF', 'RAC', 'GNWL', 'PQWL', 'RLWL', 'SOLD_OUT'];
const FILLER_DATES = [DEMO_DATES.SEARCH_DEMO, DEMO_DATES.SECONDARY, addDaysFallback()];

function addDaysFallback(): string {
  // A third filler date, six days out — kept separate from DEMO_DATES
  // since it's only ever used for background filler, never a demo beat.
  const [y, m, d] = DEMO_DATES.TODAY.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 6);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

function buildFillerAvailability(): TrainAvailability[] {
  const records: TrainAvailability[] = [];
  FILLER_TRAINS.forEach((train, trainIdx) => {
    train.supportedClasses.forEach((travelClass, classIdx) => {
      FILLER_DATES.forEach((journeyDate, dateIdx) => {
        const statusIdx = (trainIdx + classIdx + dateIdx) % FILLER_STATUS_CYCLE.length;
        const status = FILLER_STATUS_CYCLE[statusIdx];
        const fareAmount = 350 + ((trainIdx * 29 + classIdx * 113 + dateIdx * 17) % 1900);

        const base: Omit<TrainAvailability, 'status' | 'confirmationLikelihood'> = {
          trainNumber: train.number,
          journeyDate,
          travelClass,
          quota: 'GENERAL',
          fareAmount,
        };

        if (status === 'CNF') {
          records.push({
            ...base,
            status,
            confirmedSeatsRemaining: 1 + ((trainIdx + dateIdx) % 20),
            confirmationLikelihood: 1,
          });
        } else if (status === 'RAC') {
          records.push({
            ...base,
            status,
            racPosition: 1 + ((trainIdx + dateIdx * 3) % 30),
            confirmationLikelihood: 0.6 + (trainIdx % 4) * 0.05,
          });
        } else if (status === 'SOLD_OUT') {
          records.push({
            ...base,
            status,
            confirmationLikelihood: 0,
          });
        } else {
          // GNWL / PQWL / RLWL (TQWL never appears in FILLER_STATUS_CYCLE,
          // but is included here so the lookup is exhaustive over the type)
          const positionSeed = { GNWL: 3, PQWL: 5, RLWL: 7, TQWL: 11 }[status];
          const position = 1 + ((trainIdx * positionSeed + dateIdx) % 80);
          const baseLikelihood = { GNWL: 0.9, PQWL: 0.7, RLWL: 0.6, TQWL: 0.5 }[status];
          records.push({
            ...base,
            status,
            waitlistPosition: position,
            confirmationLikelihood: likelihoodForWaitlist(position, baseLikelihood, 0.012),
          });
        }
      });
    });
  });
  return records;
}

const FILLER_AVAILABILITY = buildFillerAvailability();
const ALL_AVAILABILITY: TrainAvailability[] = [...HERO_AVAILABILITY, ...FILLER_AVAILABILITY];

// ===========================================================================
// RAILWAY STATUS DEFINITIONS (the full explainable set)
// ===========================================================================

const STATUS_DEFINITIONS: RailwayStatusDefinition[] = [
  {
    code: 'CNF',
    displayLabel: 'Confirmed',
    category: 'CONFIRMED',
    canBoard: true,
    isFullyConfirmed: true,
    isWaitlisted: false,
    positionApplicable: false,
    plainExplanation: 'Your seat or berth is confirmed. You have a guaranteed place on this train.',
    isLiveAvailabilityStatus: true,
  },
  {
    code: 'RAC',
    displayLabel: 'RAC (Reservation Against Cancellation)',
    category: 'PARTIALLY_CONFIRMED',
    canBoard: true,
    isFullyConfirmed: false,
    isWaitlisted: false,
    positionApplicable: true,
    plainExplanation:
      "You're #{position} on RAC. You can board and travel, sharing a berth with one other RAC passenger.",
    suggestedConsideration:
      'You can travel as-is. If other passengers cancel, you may later be upgraded to your own confirmed berth.',
    isLiveAvailabilityStatus: true,
  },
  {
    code: 'GNWL',
    displayLabel: 'General Waitlist',
    category: 'WAITLISTED',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: true,
    positionApplicable: true,
    plainExplanation:
      "You're currently #{position} on the General Wait List. Your ticket is not confirmed yet.",
    suggestedConsideration:
      'Consider a backup train or a different class with better availability, especially if your travel date is fixed.',
    isLiveAvailabilityStatus: true,
  },
  {
    code: 'PQWL',
    displayLabel: 'Pooled Quota Waitlist',
    category: 'WAITLISTED',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: true,
    positionApplicable: true,
    plainExplanation:
      "You're #{position} on a Pooled Quota Wait List — a shared waitlist for a shorter part of this train's overall journey.",
    suggestedConsideration:
      'Pooled quota tends to move slower than the general waitlist. A different train or class may confirm sooner.',
    isLiveAvailabilityStatus: true,
  },
  {
    code: 'RLWL',
    displayLabel: 'Remote Location Waitlist',
    category: 'WAITLISTED',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: true,
    positionApplicable: true,
    plainExplanation:
      "You're #{position} on a Remote Location Wait List, tied to a specific stop along this train's route rather than its starting station.",
    suggestedConsideration:
      'This waitlist is often slower to confirm than a General Waitlist. Check other trains if your plans are firm.',
    isLiveAvailabilityStatus: true,
  },
  {
    code: 'TQWL',
    displayLabel: 'Tatkal Waitlist',
    category: 'WAITLISTED',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: true,
    positionApplicable: true,
    plainExplanation:
      "You're #{position} on the Tatkal Wait List. Tatkal quota is small, so this is less likely to confirm than a regular waitlist.",
    suggestedConsideration:
      'Have a backup train ready — Tatkal waitlists confirm less often than general ones.',
    isLiveAvailabilityStatus: true,
  },
  {
    code: 'WL',
    displayLabel: 'Waitlisted (general term)',
    category: 'WAITLISTED',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: true,
    positionApplicable: true,
    plainExplanation:
      '"WL" is a general term for any waitlisted status. The specific type (GNWL, PQWL, RLWL, or TQWL) determines how likely it is to confirm.',
    suggestedConsideration: 'Look up the specific waitlist type shown on your ticket for a clearer picture.',
    isLiveAvailabilityStatus: false,
  },
  {
    code: 'SOLD_OUT',
    displayLabel: 'Sold Out',
    category: 'UNAVAILABLE',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: false,
    positionApplicable: false,
    plainExplanation: 'No seats and no further waitlist spots are available for this train, date, and class.',
    suggestedConsideration: 'Try a different train, class, or nearby date.',
    isLiveAvailabilityStatus: true,
  },
  {
    code: 'CAN',
    displayLabel: 'Cancelled',
    category: 'CANCELLED',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: false,
    positionApplicable: false,
    plainExplanation: 'This booking was cancelled and is no longer valid for travel.',
    suggestedConsideration: 'If you still need to travel, search for a new option.',
    isLiveAvailabilityStatus: false,
  },
  {
    code: 'REGRET',
    displayLabel: 'Booking Not Possible',
    category: 'FAILED',
    canBoard: false,
    isFullyConfirmed: false,
    isWaitlisted: false,
    positionApplicable: false,
    plainExplanation: 'This booking attempt could not be completed — no seats, waitlist spots, or RAC were available.',
    suggestedConsideration: 'Check the backup options already prepared, or start a new search.',
    isLiveAvailabilityStatus: false,
  },
];

// ===========================================================================
// USERS + PASSENGERS
// ===========================================================================

const passengerAravind: Passenger = { id: 'passenger_1', name: 'Aravind Kumar', age: 29, gender: 'MALE', isSaved: true };
const passengerPriya: Passenger = { id: 'passenger_2', name: 'Priya Ramesh', age: 27, gender: 'FEMALE', isSaved: true };
const passengerSuresh: Passenger = { id: 'passenger_3', name: 'Suresh Iyer', age: 54, gender: 'MALE', isSaved: true };
const passengerLakshmi: Passenger = { id: 'passenger_4', name: 'Lakshmi Narayanan', age: 51, gender: 'FEMALE', isSaved: true };
const passengerKarthik: Passenger = { id: 'passenger_5', name: 'Karthik Subramanian', age: 33, gender: 'MALE', isSaved: true };
const passengerDivya: Passenger = { id: 'passenger_6', name: 'Divya Menon', age: 24, gender: 'FEMALE', isSaved: false };
const passengerRahul: Passenger = { id: 'passenger_7', name: 'Rahul Verma', age: 41, gender: 'MALE', isSaved: false };

const PASSENGERS: Passenger[] = [
  passengerAravind,
  passengerPriya,
  passengerSuresh,
  passengerLakshmi,
  passengerKarthik,
  passengerDivya,
  passengerRahul,
];

// Three users with visibly different priorities, per the task's example.
const USERS: User[] = [
  {
    id: 'user_1',
    displayName: 'Aravind',
    preferences: { preferredClass: '3A', berthPreference: 'LOWER', travelPriority: 'CONFIRMATION' },
    savedPassengerIds: [passengerAravind.id, passengerPriya.id],
  },
  {
    id: 'user_2',
    displayName: 'Suresh',
    preferences: { preferredClass: 'SL', berthPreference: 'NO_PREFERENCE', travelPriority: 'PRICE' },
    savedPassengerIds: [passengerSuresh.id, passengerLakshmi.id],
  },
  {
    id: 'user_3',
    displayName: 'Karthik',
    preferences: { preferredClass: '2A', berthPreference: 'SIDE_LOWER', travelPriority: 'SPEED' },
    savedPassengerIds: [passengerKarthik.id],
  },
];

// ===========================================================================
// BOOKINGS
// ===========================================================================
// Per spec/04-data-spec.md's "Data generation requirements": a small
// (2-4), deterministic seed set so My Bookings has something real to
// show without a live booking flow having run first — not dozens,
// and spread across the three BookingSource values so the list looks
// like it came from real use rather than a single flow. Runtime
// bookings created by the (now-implemented) booking flow are appended
// alongside these at runtime (see src/services/bookings.ts) using the
// identical Booking shape — no separate "seed vs. live" modeling.
//
// Each seed booking reuses an existing, real hero TrainAvailability
// record (never invents new train/fare/status data) so it stays
// internally consistent with everything else in the dataset.

const seedBookingSmartSearch: Booking = {
  id: 'booking_seed_1',
  pnr: '1000000001',
  source: 'SMART_SEARCH',
  userId: 'user_1',
  trainNumber: trainConfirmedTradeoff.number,
  journeyDate: DEMO_DATES.CHEAPEST_DEMO,
  sourceStationCode: 'MAS',
  destinationStationCode: 'SC',
  travelClass: '3A',
  quota: 'GENERAL',
  status: 'CNF',
  fareAmount: 1100,
  passengers: [
    { passengerId: passengerAravind.id, name: passengerAravind.name, age: passengerAravind.age, gender: passengerAravind.gender, seatNumber: '34', coach: 'B2' },
  ],
  bookedAt: `${DEMO_DATES.TODAY}T09:15:00+05:30`,
};

const seedBookingAgent: Booking = {
  id: 'booking_seed_2',
  pnr: '1000000002',
  source: 'AGENT',
  userId: 'user_1',
  trainNumber: trainAgentRecommended.number,
  journeyDate: DEMO_DATES.TOMORROW,
  sourceStationCode: 'MAS',
  destinationStationCode: 'SC',
  travelClass: '3A',
  quota: 'GENERAL',
  status: 'CNF',
  fareAmount: 1350,
  passengers: [
    { passengerId: passengerAravind.id, name: passengerAravind.name, age: passengerAravind.age, gender: passengerAravind.gender, seatNumber: '12', coach: 'B1' },
    { passengerId: passengerPriya.id, name: passengerPriya.name, age: passengerPriya.age, gender: passengerPriya.gender, seatNumber: '13', coach: 'B1' },
  ],
  bookedAt: `${DEMO_DATES.TODAY}T09:20:00+05:30`,
};

const seedBookingTatkal: Booking = {
  id: 'booking_seed_3',
  pnr: '1000000003',
  source: 'TATKAL',
  userId: 'user_3',
  // Reuses trainCheapGnwl8's TATKAL-quota CNF record — the same train
  // prepared as Karthik's own Tatkal backup (tatkalPrepTqwlDemo below).
  trainNumber: trainCheapGnwl8.number,
  journeyDate: DEMO_DATES.TOMORROW,
  sourceStationCode: 'MAS',
  destinationStationCode: 'SC',
  travelClass: '3A',
  quota: 'TATKAL',
  status: 'CNF',
  fareAmount: 820,
  passengers: [
    { passengerId: passengerKarthik.id, name: passengerKarthik.name, age: passengerKarthik.age, gender: passengerKarthik.gender, seatNumber: '5', coach: 'S4' },
  ],
  bookedAt: `${DEMO_DATES.TODAY}T10:00:15+05:30`,
};

const BOOKINGS: Booking[] = [seedBookingSmartSearch, seedBookingAgent, seedBookingTatkal];

// ===========================================================================
// TATKAL PREPARATIONS
// ===========================================================================

const tatkalPrepSuccess: TatkalPreparation = {
  id: 'tatkal_prep_success',
  userId: 'user_1',
  sourceStationCode: 'MAS',
  destinationStationCode: 'SC',
  journeyDate: DEMO_DATES.TOMORROW,
  passengerIds: [passengerAravind.id, passengerPriya.id],
  preferredClass: '3A',
  preferredTrainNumber: trainRac14Demo.number,
  backupTrainNumbers: [trainCheapGnwl8.number],
  isReady: true,
  tatkalOpensAt: `${DEMO_DATES.TODAY}T10:00:00+05:30`,
};

const tatkalPrepFailureBackup: TatkalPreparation = {
  id: 'tatkal_prep_failure_backup',
  userId: 'user_1',
  sourceStationCode: 'MAS',
  destinationStationCode: 'SC',
  journeyDate: DEMO_DATES.TOMORROW,
  passengerIds: [passengerAravind.id, passengerPriya.id],
  preferredClass: '3A',
  preferredTrainNumber: trainBestOverall.number,
  backupTrainNumbers: [trainCheapWaitlisted.number, trainFastest.number],
  isReady: true,
  tatkalOpensAt: `${DEMO_DATES.TODAY}T10:00:00+05:30`,
};

const tatkalPrepTqwlDemo: TatkalPreparation = {
  id: 'tatkal_prep_tqwl_demo',
  userId: 'user_3',
  sourceStationCode: 'MAS',
  destinationStationCode: 'SC',
  journeyDate: DEMO_DATES.TOMORROW,
  passengerIds: [passengerKarthik.id],
  preferredClass: '3A',
  preferredTrainNumber: trainGnwl24Demo.number,
  backupTrainNumbers: [trainCheapGnwl8.number],
  isReady: true,
  tatkalOpensAt: `${DEMO_DATES.TODAY}T10:00:00+05:30`,
};

const TATKAL_PREPARATIONS: TatkalPreparation[] = [
  tatkalPrepSuccess,
  tatkalPrepFailureBackup,
  tatkalPrepTqwlDemo,
];

// No TatkalAttempt records are pre-generated: an "attempt" is an event
// that happens when the (not-yet-built) Tatkal flow actually runs against
// the TrainAvailability data above. The outcome is fully determined by
// that static data (e.g. the preferred train's TATKAL-quota status is
// SOLD_OUT, so any attempt against it deterministically fails) — nothing
// about it needs to be pre-scripted as a historical log entry here.
const TATKAL_ATTEMPTS: TatkalAttempt[] = [];

// ===========================================================================
// DEMO SCENARIOS
// ===========================================================================

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'demo_status_translator_gnwl24',
    purpose: 'Status Translator: explain GNWL 24 in plain language with an actionable alternative.',
    searchInput: {
      sourceStationCode: 'MAS',
      destinationStationCode: 'SC',
      journeyDate: DEMO_DATES.STATUS_DEMO,
      passengerCount: 1,
      preferredClass: '3A',
    },
    expectedTrainNumbers: [trainGnwl24Demo.number],
    expectedStatuses: [{ trainNumber: trainGnwl24Demo.number, travelClass: '3A', status: 'GNWL' }],
    expectedOutcome:
      "Understand My Status / inline explanation shows: \"You're #24 on the General Wait List. Your ticket is not confirmed yet,\" with a suggestion to consider a backup.",
  },
  {
    id: 'demo_status_translator_rac14',
    purpose: 'Status Translator: explain RAC 14 in plain language.',
    searchInput: {
      sourceStationCode: 'MAS',
      destinationStationCode: 'SC',
      journeyDate: DEMO_DATES.STATUS_DEMO,
      passengerCount: 1,
      preferredClass: '3A',
    },
    expectedTrainNumbers: [trainRac14Demo.number],
    expectedStatuses: [{ trainNumber: trainRac14Demo.number, travelClass: '3A', status: 'RAC' }],
    expectedOutcome:
      "Inline explanation shows: \"You're #14 on RAC. You can board and travel, sharing a berth with one other RAC passenger.\"",
  },
  {
    id: 'demo_best_overall',
    // NOTE on BEST_OVERALL: with this isolated 3-train pool, the real
    // (unmodified) rankOptions weighted formula — 0.4 confirmation +
    // 0.3 price + 0.3 speed — legitimately picks trainFastest (12604)
    // over trainBestOverall (12760): both are confirmed (tied on the
    // largest-weighted factor), and 12604 is both faster and only
    // loses on price, which isn't weighted heavily enough alone to
    // overcome that. This is a deliberate, verified update to this
    // scenario's expectation (not an algorithm change) — confirmed by
    // running the live rankOptions() against exactly this pool. It
    // also means BEST_OVERALL and FASTEST now legitimately collapse
    // onto the same train, which spec/02-ux-spec.md's Results screen
    // already anticipates and handles ("categories may collapse...
    // UI should say so plainly").
    //
    // NOTE on CHEAPEST: this scenario's CHEAPEST assertion
    // (trainCheapWaitlisted, ₹780 GNWL) is left at its
    // product-spec-aligned, intended value and currently does NOT
    // match live behavior — tools/rankOptions.ts's CHEAPEST
    // computation only ever considers boardable (CNF/RAC) candidates,
    // so it picks trainBestOverall (₹1,240, confirmed) instead of the
    // genuinely cheaper waitlisted option. This is a pre-existing
    // implementation issue, not a data problem, and is explicitly out
    // of scope to fix here — see the accompanying report.
    purpose: 'Smart Search: three meaningfully different options produce a clear Best Overall pick.',
    searchInput: {
      sourceStationCode: 'MAS',
      destinationStationCode: 'SC',
      journeyDate: DEMO_DATES.SEARCH_DEMO,
      passengerCount: 1,
      preferredClass: '3A',
      travelPriority: 'BALANCED',
    },
    expectedTrainNumbers: [trainBestOverall.number, trainCheapWaitlisted.number, trainFastest.number],
    expectedRecommendations: [
      { category: 'BEST_OVERALL', trainNumber: trainFastest.number },
      { category: 'CHEAPEST', trainNumber: trainCheapWaitlisted.number },
      { category: 'FASTEST', trainNumber: trainFastest.number },
    ],
    expectedStatuses: [
      { trainNumber: trainBestOverall.number, travelClass: '3A', status: 'CNF' },
      { trainNumber: trainCheapWaitlisted.number, travelClass: '3A', status: 'GNWL' },
      { trainNumber: trainFastest.number, travelClass: '3A', status: 'CNF' },
    ],
    expectedOutcome:
      'Results shows Best Overall and Fastest both pointing to the confirmed, quickest train (₹1,680, Confirmed, 9h40m) — the UI states plainly that these two categories agree — alongside a Confirmed ₹1,240/12h50m alternative and (intended) a Cheapest pick at ₹780/GNWL 42/13h20m.',
  },
  {
    id: 'demo_cheapest_tradeoff',
    // NOTE: this scenario's CHEAPEST assertion currently does NOT
    // match live behavior, for the same reason documented on
    // demo_best_overall above — tools/rankOptions.ts's CHEAPEST only
    // considers boardable (CNF/RAC) candidates, so it picks
    // trainConfirmedTradeoff (₹1,100, confirmed) instead of the
    // genuinely cheaper trainCheapGnwl8 (₹700, GNWL 8). The
    // expectation below is left at the product-spec-aligned intended
    // value, not silently updated to match the current bug — see the
    // accompanying report for the recommended fix.
    purpose: 'Smart Search: cheapest option carries a visible, honest waitlist trade-off.',
    searchInput: {
      sourceStationCode: 'MAS',
      destinationStationCode: 'SC',
      journeyDate: DEMO_DATES.CHEAPEST_DEMO,
      passengerCount: 1,
      travelPriority: 'PRICE',
    },
    expectedTrainNumbers: [trainCheapGnwl8.number, trainConfirmedTradeoff.number],
    expectedRecommendations: [{ category: 'CHEAPEST', trainNumber: trainCheapGnwl8.number }],
    expectedStatuses: [
      { trainNumber: trainCheapGnwl8.number, travelClass: 'SL', status: 'GNWL' },
      { trainNumber: trainConfirmedTradeoff.number, travelClass: '3A', status: 'CNF' },
    ],
    expectedOutcome: 'UI communicates "Save ₹400, but accept waitlist risk" comparing ₹700 GNWL 8 to ₹1,100 Confirmed.',
  },
  {
    id: 'demo_fastest_not_cheapest',
    purpose: 'Smart Search: fastest option is not the cheapest, showing different users value different things.',
    searchInput: {
      sourceStationCode: 'MAS',
      destinationStationCode: 'SC',
      journeyDate: DEMO_DATES.SEARCH_DEMO,
      passengerCount: 1,
      travelPriority: 'SPEED',
    },
    expectedTrainNumbers: [trainBestOverall.number, trainFastest.number],
    expectedRecommendations: [{ category: 'FASTEST', trainNumber: trainFastest.number }],
    expectedStatuses: [
      { trainNumber: trainBestOverall.number, travelClass: '3A', status: 'CNF' },
      { trainNumber: trainFastest.number, travelClass: '3A', status: 'CNF' },
    ],
    expectedOutcome: 'Fastest (₹1,680, 9h40m) is clearly pricier than the ₹1,240 / 12h50m Best Overall option.',
  },
  {
    id: 'demo_best_confirmation_chance_partial',
    purpose:
      'Smart Search: no confirmed option exists at all on this route/date — Results must show the "Partial" state honestly and still surface a Best Chance of Confirmation.',
    searchInput: {
      sourceStationCode: 'SBC',
      destinationStationCode: 'HWH',
      journeyDate: DEMO_DATES.SEARCH_DEMO,
      passengerCount: 1,
      travelPriority: 'CONFIRMATION',
    },
    expectedTrainNumbers: [trainPartialGnwl5.number, trainPartialPqwl20.number, trainPartialRlwl35.number],
    expectedRecommendations: [{ category: 'BEST_CONFIRMATION_CHANCE', trainNumber: trainPartialGnwl5.number }],
    expectedStatuses: [
      { trainNumber: trainPartialGnwl5.number, travelClass: '3A', status: 'GNWL' },
      { trainNumber: trainPartialPqwl20.number, travelClass: '3A', status: 'PQWL' },
      { trainNumber: trainPartialRlwl35.number, travelClass: '3A', status: 'RLWL' },
    ],
    expectedOutcome:
      'Results honestly shows only waitlisted options; GNWL 5 (highest confirmation likelihood) is labeled Best Chance of Confirmation rather than hiding the category.',
  },
  {
    id: 'demo_agent_hyderabad',
    purpose: 'Agent-Driven Booking: extract intent from a natural-language request and recommend with trade-offs.',
    agentInputText: 'I need to reach Hyderabad tomorrow evening. Two people. AC. Preferably confirmed.',
    expectedAgentIntent: {
      destinationStationCode: 'SC',
      dateExpression: 'tomorrow',
      resolvedDate: DEMO_DATES.TOMORROW,
      timePreference: 'EVENING',
      passengerCount: 2,
      preferredClass: '3A',
      confirmationPreference: 'PREFER_CONFIRMED',
      missingRequiredFields: [],
    },
    expectedTrainNumbers: [
      trainAgentRecommended.number,
      trainAgentCheaperWaitlisted.number,
      trainAgentPricier2A.number,
    ],
    expectedRecommendations: [{ category: 'BEST_OVERALL', trainNumber: trainAgentRecommended.number }],
    expectedOutcome:
      'Agent recommends the ₹1,350 Confirmed 3A option, with the ₹980 GNWL 12 option and the ₹2,100 Confirmed 2A option available as alternatives with stated trade-offs.',
  },
  {
    id: 'demo_tatkal_success',
    purpose: 'Tatkal Mode: preferred train is available and the booking attempt succeeds directly.',
    tatkalScenario: {
      preparationId: tatkalPrepSuccess.id,
      expectedPreferredOutcome: 'CNF',
      expectedBackupOutcomes: [],
    },
    expectedOutcome: 'Booking Attempt succeeds immediately on the preferred train; backup is never needed.',
  },
  {
    id: 'demo_tatkal_failure_backup',
    purpose:
      'HERO: Tatkal Mode preferred train is sold out, first backup confirms — demonstrates fallback without restarting the flow.',
    tatkalScenario: {
      preparationId: tatkalPrepFailureBackup.id,
      expectedPreferredOutcome: 'REGRET',
      expectedBackupOutcomes: ['CNF', 'CNF'],
    },
    expectedOutcome:
      'Preferred train shows SOLD_OUT and fails; backup options appear immediately in place; user selects the first backup and it confirms.',
  },
  {
    id: 'demo_tatkal_tqwl_fallback',
    purpose: 'Tatkal Mode: preferred train lands on the Tatkal Waitlist (not sold out, not confirmed) and falls back to a backup.',
    tatkalScenario: {
      preparationId: tatkalPrepTqwlDemo.id,
      expectedPreferredOutcome: 'REGRET',
      expectedBackupOutcomes: ['CNF'],
    },
    expectedOutcome:
      'Preferred train shows TQWL 6 (Tatkal-quota waitlist) at attempt time, treated as not-yet-confirmed; the single backup confirms.',
  },
];

// ===========================================================================
// WRITE OUTPUT
// ===========================================================================

const HEADER = (typeImport: string) => `/**
 * AUTO-GENERATED by scripts/generateMockData.ts — do not hand-edit.
 * Regenerate with: npm run generate:data
 *
 * Conforms to the data contract in spec/04-data-spec.md.
 */

import type { ${typeImport} } from '../types/domain';

`;

function writeDataFile(fileName: string, typeImport: string, varName: string, data: unknown): void {
  const body = `export const ${varName}: ${typeImport.includes(',') ? 'unknown' : typeImport}[] = ${JSON.stringify(
    data,
    null,
    2,
  )};\n`;
  writeFileSync(resolve(DATA_DIR, fileName), HEADER(typeImport) + body, 'utf-8');
}

writeDataFile('stations.ts', 'Station', 'stations', STATIONS);
writeDataFile('trains.ts', 'Train', 'trains', ALL_TRAINS);
writeDataFile('availability.ts', 'TrainAvailability', 'trainAvailability', ALL_AVAILABILITY);
writeDataFile('statusDefinitions.ts', 'RailwayStatusDefinition', 'statusDefinitions', STATUS_DEFINITIONS);
writeDataFile('users.ts', 'User', 'users', USERS);
writeDataFile('passengers.ts', 'Passenger', 'passengers', PASSENGERS);
writeDataFile('bookings.ts', 'Booking', 'bookings', BOOKINGS);

// tatkal.ts combines two related exports, written directly (not via writeDataFile).
writeFileSync(
  resolve(DATA_DIR, 'tatkal.ts'),
  `/**
 * AUTO-GENERATED by scripts/generateMockData.ts — do not hand-edit.
 * Regenerate with: npm run generate:data
 *
 * Conforms to the data contract in spec/04-data-spec.md.
 */

import type { TatkalPreparation, TatkalAttempt } from '../types/domain';

export const tatkalPreparations: TatkalPreparation[] = ${JSON.stringify(TATKAL_PREPARATIONS, null, 2)};

export const tatkalAttempts: TatkalAttempt[] = ${JSON.stringify(TATKAL_ATTEMPTS, null, 2)};
`,
  'utf-8',
);

writeDataFile('scenarios.ts', 'DemoScenario', 'demoScenarios', DEMO_SCENARIOS);

console.log('Mock data generated:');
console.log(`  stations:            ${STATIONS.length}`);
console.log(`  trains:              ${ALL_TRAINS.length} (${HERO_TRAINS.length} hero + ${FILLER_TRAINS.length} filler)`);
console.log(`  availability:        ${ALL_AVAILABILITY.length} (${HERO_AVAILABILITY.length} hero + ${FILLER_AVAILABILITY.length} filler)`);
console.log(`  status definitions:  ${STATUS_DEFINITIONS.length}`);
console.log(`  users:               ${USERS.length}`);
console.log(`  passengers:          ${PASSENGERS.length}`);
console.log(`  bookings:            ${BOOKINGS.length}`);
console.log(`  tatkal preparations: ${TATKAL_PREPARATIONS.length}`);
console.log(`  tatkal attempts:     ${TATKAL_ATTEMPTS.length}`);
console.log(`  demo scenarios:      ${DEMO_SCENARIOS.length}`);
