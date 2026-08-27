/**
 * Booking Success — see spec/02-ux-spec.md's Booking Success screen
 * ("shared: Smart Search flow & Agent flow"). One implementation for
 * every BookingSource — no per-source branching beyond an optional
 * recap line, so this needs no changes when Agent/Tatkal booking is
 * added later. Refresh-safe: reads a real Booking by id from the URL.
 */

import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { getBooking } from '../services/bookings';
import { getTrain } from '../services/trains';
import { formatFare } from '../utils/format';

export function BookingSuccess() {
  const { t } = useLanguage();
  const { bookingId } = useParams<{ bookingId: string }>();
  const booking = bookingId ? getBooking(bookingId) : undefined;
  const train = booking ? getTrain(booking.trainNumber) : undefined;

  if (!booking || !train) {
    return (
      <div>
        <p className="text-gray-700">{t('bookingSuccess.notFound')}</p>
        <Link to="/" className="mt-3 inline-block text-blue-700 underline">
          {t('nav.home')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-green-700">{t('bookingSuccess.title')}</h1>

      <dl className="mt-4 space-y-2 rounded border border-gray-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">{t('bookingSuccess.pnrLabel')}</dt>
          <dd className="font-mono font-semibold text-gray-900">{booking.pnr}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">{train.name}</dt>
          <dd className="font-medium text-gray-900">
            {train.number} · {booking.travelClass}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">
            {booking.sourceStationCode} → {booking.destinationStationCode}
          </dt>
          <dd>{booking.journeyDate}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">{t('trainDetails.fareLabel')}</dt>
          <dd>{formatFare(booking.fareAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">{t('myBookings.passengerCountLabel', { count: booking.passengers.length })}</dt>
          <dd className="font-mono">{booking.status}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-gray-400">{t('bookingSuccess.mockNotice')}</p>

      <div className="mt-6 flex gap-3">
        <Link
          to="/bookings"
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('bookingSuccess.goToMyBookings')}
        </Link>
        <Link
          to="/"
          className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('bookingSuccess.goHome')}
        </Link>
      </div>
    </div>
  );
}
