/**
 * Smart Search — see spec/02-ux-spec.md's Smart Search screen.
 * Captures a SearchRequest and navigates to Results with it encoded
 * in the URL (spec/05-technical-spec.md §6's URL-state policy — no
 * separate search store).
 */

import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { getStations } from '../services/stations';
import { paramsToSearchRequest, searchRequestToParams } from '../utils/searchRequestUrl';
import { DEMO_DATES } from '../data';
import type { TravelClass, TravelPriority } from '../types/domain';

const CLASS_OPTIONS: TravelClass[] = ['SL', '3A', '2A', '1A', 'CC'];
const PRIORITY_OPTIONS: TravelPriority[] = ['BALANCED', 'PRICE', 'SPEED', 'CONFIRMATION', 'OVERNIGHT'];

export function SmartSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const stations = useMemo(() => [...getStations()].sort((a, b) => a.name.localeCompare(b.name)), []);

  // If we arrived here via a "back to search" link from Results/Train
  // Details, the previous SearchRequest is in the URL — prefill from
  // it so the user's prior input isn't lost (spec/02-ux-spec.md's
  // back-behavior rule).
  const [searchParams] = useSearchParams();
  const priorRequest = useMemo(() => paramsToSearchRequest(searchParams), [searchParams]);

  const [sourceStationCode, setSourceStationCode] = useState(priorRequest?.sourceStationCode ?? '');
  const [destinationStationCode, setDestinationStationCode] = useState(priorRequest?.destinationStationCode ?? '');
  const [journeyDate, setJourneyDate] = useState(priorRequest?.journeyDate ?? DEMO_DATES.SEARCH_DEMO);
  const [passengerCount, setPassengerCount] = useState(priorRequest?.passengerCount ?? 1);
  const [preferredClass, setPreferredClass] = useState<TravelClass | ''>(priorRequest?.preferredClass ?? '');
  const [travelPriority, setTravelPriority] = useState<TravelPriority>(priorRequest?.travelPriority ?? 'BALANCED');
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!sourceStationCode) {
      setError(t('search.errorMissingFrom'));
      return;
    }
    if (!destinationStationCode) {
      setError(t('search.errorMissingTo'));
      return;
    }
    if (sourceStationCode === destinationStationCode) {
      setError(t('search.errorSameStation'));
      return;
    }
    if (!journeyDate) {
      setError(t('search.errorMissingDate'));
      return;
    }
    if (!Number.isInteger(passengerCount) || passengerCount < 1) {
      setError(t('search.errorInvalidPassengers'));
      return;
    }

    setError(undefined);
    const params = searchRequestToParams({
      sourceStationCode,
      destinationStationCode,
      journeyDate,
      passengerCount,
      preferredClass: preferredClass || undefined,
      travelPriority,
    });
    navigate(`/results?${params.toString()}`);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900">{t('search.title')}</h1>
      <p className="mt-2 text-gray-500">{t('search.subtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="from-station" className="block text-sm font-medium text-gray-700">
              {t('search.fromLabel')}
            </label>
            <select
              id="from-station"
              value={sourceStationCode}
              onChange={(e) => setSourceStationCode(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <option value="">—</option>
              {stations.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="to-station" className="block text-sm font-medium text-gray-700">
              {t('search.toLabel')}
            </label>
            <select
              id="to-station"
              value={destinationStationCode}
              onChange={(e) => setDestinationStationCode(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <option value="">—</option>
              {stations.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="journey-date" className="block text-sm font-medium text-gray-700">
              {t('search.dateLabel')}
            </label>
            <input
              id="journey-date"
              type="date"
              value={journeyDate}
              min={DEMO_DATES.TODAY}
              onChange={(e) => setJourneyDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            />
          </div>

          <div>
            <label htmlFor="passenger-count" className="block text-sm font-medium text-gray-700">
              {t('search.passengersLabel')}
            </label>
            <input
              id="passenger-count"
              type="number"
              min={1}
              max={6}
              value={passengerCount}
              onChange={(e) => setPassengerCount(Number(e.target.value))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="preferred-class" className="block text-sm font-medium text-gray-700">
              {t('search.classLabel')}
            </label>
            <select
              id="preferred-class"
              value={preferredClass}
              onChange={(e) => setPreferredClass(e.target.value as TravelClass | '')}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <option value="">{t('search.classAny')}</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="travel-priority" className="block text-sm font-medium text-gray-700">
              {t('search.priorityLabel')}
            </label>
            <select
              id="travel-priority"
              value={travelPriority}
              onChange={(e) => setTravelPriority(e.target.value as TravelPriority)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {t(
                    p === 'BALANCED'
                      ? 'search.priorityBalanced'
                      : p === 'PRICE'
                        ? 'search.priorityPrice'
                        : p === 'SPEED'
                          ? 'search.prioritySpeed'
                          : p === 'CONFIRMATION'
                            ? 'search.priorityConfirmation'
                            : 'search.priorityOvernight',
                  )}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('search.submit')}
        </button>
      </form>
    </div>
  );
}
