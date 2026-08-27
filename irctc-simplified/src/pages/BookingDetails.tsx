/**
 * Booking Details — see spec/02-ux-spec.md's Booking Details screen.
 * Read-only, entered from My Bookings, refresh-safe (identified by
 * bookingId path param). No mutation actions, per the explicit
 * non-goals (no cancel/refund/modify/reschedule/payment).
 */

import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { getBooking } from '../services/bookings';
import { getTrain } from '../services/trains';
import { StatusBadge } from '../components/StatusBadge';
import { getAvailability } from '../tools/getAvailability';
import { formatFare } from '../utils/format';

export function BookingDetails() {
  const { t } = useLanguage();
  const { bookingId } = useParams<{ bookingId: string }>();
  const booking = bookingId ? getBooking(bookingId) : undefined;
  const train = booking ? getTrain(booking.trainNumber) : undefined;
  // Best-effort fresh status lookup for display, matching the same
  // canonical StatusBadge treatment used everywhere else — falls back
  // to just the booking's own recorded status if the underlying
  // availability record can't be resolved (e.g. removed from a future
  // dataset regeneration).
  const availability = booking
    ? getAvailability(booking.trainNumber, booking.journeyDate, booking.travelClass, booking.quota)
    : undefined;

  if (!booking || !train) {
    return (
      <div>
        <p className="text-gray-700">{t('bookingDetails.notFound')}</p>
        <Link to="/bookings" className="mt-3 inline-block text-blue-700 underline">
          {t('bookingDetails.backToBookings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link to="/bookings" className="text-sm text-blue-700 underline">
        {t('bookingDetails.backToBookings')}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{train.name}</h1>
      <p className="text-gray-500">
        {train.number} · {booking.travelClass}
      </p>

      <dl className="mt-6 space-y-3 rounded border border-gray-200 bg-white p-4">
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('bookingDetails.pnrLabel')}</dt>
          <dd className="font-mono font-semibold text-gray-900">{booking.pnr}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">
            {booking.sourceStationCode} → {booking.destinationStationCode}
          </dt>
          <dd className="font-medium text-gray-900">{booking.journeyDate}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.classLabel')}</dt>
          <dd className="font-medium text-gray-900">{booking.travelClass}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.fareLabel')}</dt>
          <dd className="font-medium text-gray-900">{formatFare(booking.fareAmount)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.statusLabel')}</dt>
          <dd>{availability ? <StatusBadge availability={availability} /> : <span className="font-mono">{booking.status}</span>}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded border border-gray-200 bg-white p-4">
        <p className="font-medium text-gray-900">{t('bookingDetails.passengersLabel')}</p>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {booking.passengers.map((p, i) => (
            <li key={i}>
              {p.name} · {p.age} · {p.gender}
              {p.seatNumber && p.coach ? ` · ${p.coach}/${p.seatNumber}` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
