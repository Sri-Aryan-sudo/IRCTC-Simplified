/**
 * Tatkal orchestration. See spec/05-technical-spec.md §15 and
 * spec/03-agent-spec.md §12. Determines the next train to attempt
 * (preferred first, then backups in prepared order), runs the
 * attempt through the same tools every other flow uses, and persists
 * the resulting TatkalAttempt — so returning to `/tatkal/attempt`
 * after navigating away resumes exactly where it left off (Product
 * Principle 4), rather than restarting.
 */

import { tools } from '../tools';
import { appendTatkalAttempt } from '../services/tatkal';
import { getPassenger } from '../services/passengers';
import type { ApprovalToken } from './approval';
import type { Booking, BookingPassenger, TatkalAttempt, TatkalPreparation } from '../types/domain';

export interface NextAttemptTarget {
  trainNumber: string;
  attemptOrder: number;
}

/** Preferred train first (attemptOrder 0), then backups in prepared order. Undefined once exhausted. */
export function getNextAttemptTarget(
  preparation: TatkalPreparation,
  priorAttempts: TatkalAttempt[],
): NextAttemptTarget | undefined {
  if (priorAttempts.length === 0) {
    return { trainNumber: preparation.preferredTrainNumber, attemptOrder: 0 };
  }
  const backupsAttempted = priorAttempts.filter((a) => a.attemptOrder > 0).length;
  if (backupsAttempted < preparation.backupTrainNumbers.length) {
    return { trainNumber: preparation.backupTrainNumbers[backupsAttempted], attemptOrder: backupsAttempted + 1 };
  }
  return undefined;
}

function passengersFor(preparation: TatkalPreparation): BookingPassenger[] {
  return preparation.passengerIds
    .map((id) => getPassenger(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ passengerId: p.id, name: p.name, age: p.age, gender: p.gender }));
}

export interface AttemptNextResult {
  attempt: TatkalAttempt;
  booking?: Booking;
}

/**
 * Runs exactly one attempt (preferred or the next backup) and
 * persists it. `token` must come from `issueApprovalToken`, called
 * only once `TatkalPreparation.isReady` is true — that flag IS the
 * advance approval for this whole bounded, user-chosen option set
 * (spec/03-agent-spec.md §8's Tatkal note); no fresh per-backup
 * confirmation is asked.
 */
export function attemptNext(
  preparation: TatkalPreparation,
  priorAttempts: TatkalAttempt[],
  token: ApprovalToken,
): AttemptNextResult | undefined {
  const target = getNextAttemptTarget(preparation, priorAttempts);
  if (!target) return undefined;

  const result = tools.attemptBooking(target.trainNumber, preparation.journeyDate, preparation.preferredClass, 'TATKAL');

  let booking: Booking | undefined;
  if (result.outcome !== 'REGRET' && result.availability) {
    const passengerCount = preparation.passengerIds.length || 1;
    booking = tools.createBooking(
      {
        source: 'TATKAL',
        userId: preparation.userId,
        trainNumber: target.trainNumber,
        journeyDate: preparation.journeyDate,
        sourceStationCode: preparation.sourceStationCode,
        destinationStationCode: preparation.destinationStationCode,
        travelClass: preparation.preferredClass,
        quota: 'TATKAL',
        status: result.outcome,
        fareAmount: result.availability.fareAmount * passengerCount,
        passengers: passengersFor(preparation),
      },
      token,
    );
  }

  const attempt: TatkalAttempt = {
    id: `tatkal_attempt_${preparation.id}_${target.attemptOrder}`,
    preparationId: preparation.id,
    trainNumber: target.trainNumber,
    attemptOrder: target.attemptOrder,
    attemptedAt: new Date().toISOString(),
    outcome: result.outcome,
    resultingBookingId: booking?.id,
  };

  return { attempt: appendTatkalAttempt(attempt), booking };
}
