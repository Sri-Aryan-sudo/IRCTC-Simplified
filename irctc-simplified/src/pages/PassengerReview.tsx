/**
 * Passenger Review — see spec/02-ux-spec.md's Passenger Review screen.
 * Fully identified via URL (train/date/class + the originating search
 * params), so a refresh works — no location.state. Doubles as the
 * Smart Search flow's explicit approval gate (there is no separate
 * Approval screen in this flow per spec/02-ux-spec.md's route map —
 * that pattern is Agent-specific).
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getTrain } from '../services/trains';
import { getPassengers } from '../services/passengers';
import { getAvailability } from '../tools/getAvailability';
import { attemptBooking } from '../tools/attemptBooking';
import { createBooking } from '../tools/createBooking';
import { issueApprovalToken } from '../domain/approval';
import { withSimulatedDelay } from '../utils/withSimulatedDelay';
import { paramsToPassengerReview, paramsToSearchRequest } from '../utils/searchRequestUrl';
import { StatusBadge } from '../components/StatusBadge';
import { formatDuration, formatFare } from '../utils/format';
import type { BookingPassenger } from '../types/domain';

type Stage = 'reviewing' | 'confirming' | 'submitting' | 'failed';

export function PassengerReview() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const identity = paramsToPassengerReview(searchParams);
  const request = paramsToSearchRequest(searchParams);
  const train = identity ? getTrain(identity.trainNumber) : undefined;
  const availability = identity
    ? getAvailability(identity.trainNumber, identity.journeyDate, identity.travelClass, 'GENERAL')
    : undefined;

  const savedPassengers = currentUser ? getPassengers(currentUser.id) : [];
  const requiredCount = request?.passengerCount ?? 1;

  const [selectedIds, setSelectedIds] = useState<string[]>(() => savedPassengers.slice(0, requiredCount).map((p) => p.id));
  const [stage, setStage] = useState<Stage>('reviewing');

  if (!identity || !train || !availability || !currentUser) {
    return (
      <div>
        <p className="text-gray-700">{t('trainDetails.notFound')}</p>
        <Link to="/search" className="mt-3 inline-block text-blue-700 underline">
          {t('results.backToSearch')}
        </Link>
      </div>
    );
  }

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  const hasEnoughSavedPassengers = savedPassengers.length >= requiredCount;
  const selectionValid = selectedIds.length === requiredCount;
  const totalFare = availability.fareAmount * requiredCount;

  async function handleConfirm() {
    if (!identity || !availability || !train || !currentUser) return;
    setStage('submitting');

    const token = issueApprovalToken(`${identity.trainNumber}|${identity.journeyDate}|${identity.travelClass}`);
    const attempt = await withSimulatedDelay(() =>
      attemptBooking(identity.trainNumber, identity.journeyDate, identity.travelClass, 'GENERAL'),
    );

    if (attempt.outcome === 'REGRET' || !attempt.availability) {
      setStage('failed');
      return;
    }

    const passengers: BookingPassenger[] = selectedIds
      .map((id) => savedPassengers.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        passengerId: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        ...(attempt.outcome === 'CNF' ? { seatNumber: '—', coach: '—' } : {}),
      }));

    const booking = createBooking(
      {
        source: 'SMART_SEARCH',
        userId: currentUser.id,
        trainNumber: identity.trainNumber,
        journeyDate: identity.journeyDate,
        sourceStationCode: train.sourceStationCode,
        destinationStationCode: train.destinationStationCode,
        travelClass: identity.travelClass,
        quota: 'GENERAL',
        status: attempt.outcome,
        fareAmount: attempt.availability.fareAmount * requiredCount,
        passengers,
      },
      token,
    );

    navigate(`/booking/success/${booking.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900">{t('passengerReview.title')}</h1>

      <dl className="mt-4 space-y-2 rounded border border-gray-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">{train.name}</dt>
          <dd className="font-medium text-gray-900">
            {train.number} · {identity.travelClass}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">{t('trainDetails.durationLabel')}</dt>
          <dd>{formatDuration(train.durationMinutes)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">{t('trainDetails.fareLabel')}</dt>
          <dd>{formatFare(availability.fareAmount)} × {requiredCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">{t('trainDetails.statusLabel')}</dt>
          <dd><StatusBadge availability={availability} /></dd>
        </div>
      </dl>

      {stage === 'reviewing' && (
        <div className="mt-6">
          <p className="font-medium text-gray-900">{t('passengerReview.selectPassengersLabel')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('passengerReview.passengerRequiredCount', { count: requiredCount })}</p>

          {!hasEnoughSavedPassengers && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {t('passengerReview.notEnoughSavedPassengers')}
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {savedPassengers.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  />
                  <span>
                    {p.name} · {p.age} · {p.gender}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={!selectionValid}
            onClick={() => setStage('confirming')}
            className="mt-4 rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t('passengerReview.reviewAction')}
          </button>
        </div>
      )}

      {(stage === 'confirming' || stage === 'submitting') && (
        <div className="mt-6 rounded border border-blue-200 bg-blue-50 p-4">
          <p className="font-medium text-blue-900">{t('passengerReview.confirmSummaryTitle')}</p>
          <p className="mt-1 text-sm text-blue-900">
            {t('passengerReview.confirmSummaryBody', {
              count: requiredCount,
              train: train.name,
              fare: formatFare(totalFare),
            })}
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={stage === 'submitting'}
              className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {stage === 'submitting' ? t('passengerReview.submitting') : t('passengerReview.confirmAction')}
            </button>
            <button
              type="button"
              onClick={() => setStage('reviewing')}
              disabled={stage === 'submitting'}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {t('passengerReview.goBackAction')}
            </button>
          </div>
        </div>
      )}

      {stage === 'failed' && (
        <div className="mt-6 rounded border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">{t('passengerReview.bookingFailed')}</p>
          <button
            type="button"
            onClick={() => setStage('reviewing')}
            className="mt-3 rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t('passengerReview.goBackAction')}
          </button>
        </div>
      )}
    </div>
  );
}
