/**
 * My Bookings — see spec/02-ux-spec.md's My Bookings screen.
 * Loading/Populated/Empty/Error states. Reads via services/bookings
 * (seed + localStorage merge, spec/05-technical-spec.md §16) so a
 * booking made moments ago already appears without a manual refresh.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getBookings } from '../services/bookings';
import { getTrain } from '../services/trains';
import { withSimulatedDelay } from '../utils/withSimulatedDelay';
import { formatFare } from '../utils/format';
import type { Booking } from '../types/domain';

type LoadState = 'loading' | 'ready' | 'error';

export function MyBookings() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [state, setState] = useState<LoadState>('loading');
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    setState('loading');
    withSimulatedDelay(() => getBookings(currentUser.id))
      .then((result) => {
        setBookings(result);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('myBookings.title')}</h1>

      {state === 'loading' && <p className="mt-4 text-gray-500">{t('myBookings.loading')}</p>}

      {state === 'error' && <p className="mt-4 text-red-700">{t('common.errorGeneric')}</p>}

      {state === 'ready' && bookings.length === 0 && (
        <div className="mt-4 rounded border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-900">{t('myBookings.emptyTitle')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('myBookings.emptyBody')}</p>
          <Link to="/search" className="mt-3 inline-block text-blue-700 underline">
            {t('nav.smartSearch')}
          </Link>
        </div>
      )}

      {state === 'ready' && bookings.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {bookings.map((booking) => {
            const train = getTrain(booking.trainNumber);
            if (!train) return null;
            return (
              <Link
                key={booking.id}
                to={`/bookings/${booking.id}`}
                className="rounded border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-gray-900">{train.name}</span>
                  <span className="font-mono text-xs text-gray-500">{booking.pnr}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {booking.sourceStationCode} → {booking.destinationStationCode} · {booking.journeyDate}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {booking.travelClass} · {t('myBookings.passengerCountLabel', { count: booking.passengers.length })} ·{' '}
                    {formatFare(booking.fareAmount)}
                  </span>
                  <span className="font-mono text-xs font-medium text-gray-700">{booking.status}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
