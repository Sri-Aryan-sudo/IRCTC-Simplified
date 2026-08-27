/**
 * Booking Attempt → Success / Backup — see spec/02-ux-spec.md's
 * Booking Attempt screen. Auto-attempts the preferred train once on
 * arrival (spec/05-technical-spec.md §15); on failure, surfaces the
 * next prepared backup immediately — the user triggers each backup
 * attempt explicitly (§15), never a fresh approval prompt (§8's
 * Tatkal note: `TatkalPreparation.isReady` already is the approval).
 * Resumes correctly on remount by reading persisted TatkalAttempts
 * first (Product Principle 4 — never restart the journey).
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getTatkalPreparation, getTatkalAttempts } from '../services/tatkal';
import { attemptNext, getNextAttemptTarget } from '../domain/tatkalFlow';
import { issueApprovalToken } from '../domain/approval';
import { getTrain } from '../services/trains';
import { getBooking } from '../services/bookings';
import { formatFare } from '../utils/format';
import type { TatkalAttempt } from '../types/domain';

export function TatkalAttempt() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const preparation = currentUser ? getTatkalPreparation(currentUser.id) : undefined;

  const [attempts, setAttempts] = useState<TatkalAttempt[]>(() => (preparation ? getTatkalAttempts(preparation.id) : []));
  const [isAttempting, setIsAttempting] = useState(false);
  const autoStarted = useRef(false);

  const lastAttempt = attempts[attempts.length - 1];
  const successfulAttempt = attempts.find((a) => a.resultingBookingId);
  const booking = successfulAttempt?.resultingBookingId ? getBooking(successfulAttempt.resultingBookingId) : undefined;
  const nextTarget = preparation ? getNextAttemptTarget(preparation, attempts) : undefined;

  function runAttempt() {
    if (!preparation) return;
    setIsAttempting(true);
    // Brief, deliberate pacing — real Tatkal is fast-moving, so this
    // stays short rather than dragging the simulation out (§UX spec).
    window.setTimeout(() => {
      const token = issueApprovalToken(preparation.id);
      const result = attemptNext(preparation, attempts, token);
      if (result) {
        setAttempts((current) => [...current, result.attempt]);
      }
      setIsAttempting(false);
    }, 900);
  }

  useEffect(() => {
    if (autoStarted.current) return;
    if (preparation?.isReady && attempts.length === 0) {
      autoStarted.current = true;
      runAttempt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser || !preparation || !preparation.isReady) {
    return (
      <div>
        <p className="text-gray-700">{t('tatkalCountdown.noPreparation')}</p>
        <Link to="/tatkal" className="mt-3 inline-block text-blue-700 underline">
          {t('tatkal.title')}
        </Link>
      </div>
    );
  }

  if (isAttempting) {
    const attemptingTrain = getTrain(
      attempts.length === 0 ? preparation.preferredTrainNumber : (nextTarget?.trainNumber ?? preparation.preferredTrainNumber),
    );
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-lg font-medium text-gray-900">{t('tatkalAttempt.attemptingLabel', { train: attemptingTrain?.name ?? '' })}</p>
        <p className="mt-2 text-sm text-gray-500">{t('tatkalAttempt.attemptingNotice')}</p>
      </div>
    );
  }

  if (booking) {
    return (
      <div className="mx-auto max-w-md rounded border border-green-200 bg-green-50 p-4">
        <p className="font-medium text-green-900">{t('bookingSuccess.title')}</p>
        <p className="mt-1 text-sm text-green-800">{t('bookingSuccess.mockNotice')}</p>
        <dl className="mt-3 space-y-1 text-sm text-green-900">
          <div className="flex justify-between">
            <dt>{t('bookingSuccess.pnrLabel')}</dt>
            <dd className="font-mono">{booking.pnr}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('trainDetails.fareLabel')}</dt>
            <dd>{formatFare(booking.fareAmount)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-3">
          <Link to="/bookings" className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
            {t('bookingSuccess.goToMyBookings')}
          </Link>
          <Link to="/" className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
            {t('bookingSuccess.goHome')}
          </Link>
        </div>
      </div>
    );
  }

  // No booking yet — the most recent attempt (if any) failed.
  return (
    <div className="mx-auto max-w-md">
      {lastAttempt && (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">
            {t('tatkalAttempt.failedLabel', { train: getTrain(lastAttempt.trainNumber)?.name ?? '' })}
          </p>
        </div>
      )}

      {nextTarget ? (
        <div className="mt-4 rounded border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-900">{t('tatkalAttempt.backupAvailableTitle')}</p>
          <p className="mt-1 text-sm text-gray-500">{getTrain(nextTarget.trainNumber)?.name}</p>
          <button
            type="button"
            onClick={runAttempt}
            className="mt-3 rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t('tatkalAttempt.tryBackupAction')}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-900">{t('tatkalAttempt.exhaustedTitle')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('tatkalAttempt.exhaustedBody')}</p>
          <div className="mt-3 flex gap-3">
            <Link to="/search" className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
              {t('nav.smartSearch')}
            </Link>
            <Link to="/" className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
              {t('bookingSuccess.goHome')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
