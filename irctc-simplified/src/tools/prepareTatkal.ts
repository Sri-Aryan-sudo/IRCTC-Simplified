/**
 * Tool 6 — prepareTatkal. See spec/03-agent-spec.md §6.
 *
 * Creates a deterministic TatkalPreparation record. Only ever
 * produces a preparation — never a Booking or a TatkalAttempt.
 * Requires at least one backup before the preparation can be marked
 * `isReady` (mirrors the validation rule in spec/04-data-spec.md).
 *
 * One active preparation per user (services/tatkal.ts): a newer
 * preparation for the same user replaces the older one, so the id is
 * stable per user rather than randomly generated per call.
 */

import { saveTatkalPreparation } from '../services/tatkal';
import { DEMO_TODAY } from '../data';
import type { StationCode, TatkalPreparation, TrainNumber, TravelClass } from '../types/domain';

export interface PrepareTatkalInput {
  userId: string;
  sourceStationCode: StationCode;
  destinationStationCode: StationCode;
  journeyDate: string;
  preferredClass: TravelClass;
  preferredTrainNumber: TrainNumber;
  backupTrainNumbers: TrainNumber[];
  passengerIds: string[];
}

export function prepareTatkal(input: PrepareTatkalInput): TatkalPreparation {
  const preparation: TatkalPreparation = {
    id: `tatkal_prep_${input.userId}`,
    userId: input.userId,
    sourceStationCode: input.sourceStationCode,
    destinationStationCode: input.destinationStationCode,
    journeyDate: input.journeyDate,
    passengerIds: input.passengerIds,
    preferredClass: input.preferredClass,
    preferredTrainNumber: input.preferredTrainNumber,
    backupTrainNumbers: input.backupTrainNumbers,
    isReady: input.backupTrainNumbers.length > 0,
    tatkalOpensAt: `${DEMO_TODAY}T10:00:00+05:30`,
  };

  return saveTatkalPreparation(preparation);
}
