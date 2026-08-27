/**
 * Tatkal Mode — entry/overview. See spec/02-ux-spec.md's Tatkal Mode
 * screen. Frames Tatkal as preparation-first, and resumes an
 * existing TatkalPreparation (spec/05-technical-spec.md §4/§16) —
 * routing straight to Countdown/Booking Attempt if one already
 * exists, rather than forcing the user to redo preparation.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getTatkalPreparation, getTatkalAttempts } from '../services/tatkal';
import { getNextAttemptTarget } from '../domain/tatkalFlow';
import { getTrain } from '../services/trains';

export function Tatkal() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const preparation = getTatkalPreparation(currentUser.id);
  const attempts = preparation ? getTatkalAttempts(preparation.id) : [];
  const successfulAttempt = attempts.find((a) => a.resultingBookingId);
  const nextTarget = preparation ? getNextAttemptTarget(preparation, attempts) : undefined;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900">{t('tatkal.title')}</h1>
      <p className="mt-2 text-gray-500">{t('tatkal.subtitle')}</p>

      {!preparation && (
        <div className="mt-6">
          <Link
            to="/tatkal/prepare"
            className="inline-block rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t('tatkal.startAction')}
          </Link>
        </div>
      )}

      {preparation && successfulAttempt && (
        <div className="mt-6 rounded border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-900">{t('tatkal.alreadyBookedTitle')}</p>
          <Link to="/bookings" className="mt-3 inline-block text-blue-700 underline">
            {t('myBookings.title')}
          </Link>
        </div>
      )}

      {preparation && !successfulAttempt && preparation.isReady && (
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-900">
            {getTrain(preparation.preferredTrainNumber)?.name} · {preparation.preferredClass}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {t('tatkal.backupCountLabel', { count: preparation.backupTrainNumbers.length })}
          </p>
          {nextTarget ? (
            <Link
              to={attempts.length === 0 ? '/tatkal/countdown' : '/tatkal/attempt'}
              className="mt-3 inline-block rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
            >
              {attempts.length === 0 ? t('tatkal.continueToCountdown') : t('tatkal.continueAttempt')}
            </Link>
          ) : (
            <p className="mt-3 text-sm text-red-700">{t('tatkal.exhaustedTitle')}</p>
          )}
        </div>
      )}

      {preparation && !successfulAttempt && !preparation.isReady && (
        <div className="mt-6">
          <Link
            to="/tatkal/prepare"
            className="inline-block rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
          >
            {t('tatkal.resumePreparationAction')}
          </Link>
        </div>
      )}
    </div>
  );
}
