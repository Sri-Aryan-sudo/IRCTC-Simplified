/**
 * Preparation — see spec/02-ux-spec.md's Preparation screen. Builds
 * a TatkalPreparation via tools/prepareTatkal: journey, passengers,
 * preferred train, and at least one backup (required before
 * `isReady` — spec/04-data-spec.md's validation rule, and the edge
 * case in spec/02-ux-spec.md that a single-shot preparation with no
 * backup defeats the point of Tatkal Mode).
 */

import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getStations } from '../services/stations';
import { getTrains } from '../services/trains';
import { getPassengers } from '../services/passengers';
import { getTatkalPreparation } from '../services/tatkal';
import { prepareTatkal } from '../tools/prepareTatkal';
import { DEMO_DATES } from '../data';
import type { TravelClass } from '../types/domain';

const CLASS_OPTIONS: TravelClass[] = ['SL', '3A', '2A', '1A', 'CC'];

export function TatkalPrepare() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const stations = useMemo(() => [...getStations()].sort((a, b) => a.name.localeCompare(b.name)), []);
  const existing = currentUser ? getTatkalPreparation(currentUser.id) : undefined;
  const savedPassengers = currentUser ? getPassengers(currentUser.id) : [];

  // A Tatkal-intent request handled by the Agent (spec/03-agent-spec.md
  // §12) hands off here with the extracted intent in the URL, rather
  // than silently falling through to normal booking or guessing which
  // trains to prepare — preferred/backup train selection still needs
  // the user's explicit choice (spec/02-ux-spec.md's Preparation screen).
  const [searchParams] = useSearchParams();
  const prefillFrom = searchParams.get('from');
  const prefillTo = searchParams.get('to');
  const prefillDate = searchParams.get('date');
  const prefillClass = searchParams.get('class') as TravelClass | null;

  const [sourceStationCode, setSourceStationCode] = useState(existing?.sourceStationCode ?? prefillFrom ?? '');
  const [destinationStationCode, setDestinationStationCode] = useState(
    existing?.destinationStationCode ?? prefillTo ?? '',
  );
  const [journeyDate, setJourneyDate] = useState(existing?.journeyDate ?? prefillDate ?? DEMO_DATES.TOMORROW);
  const [preferredClass, setPreferredClass] = useState<TravelClass>(existing?.preferredClass ?? prefillClass ?? '3A');
  const [preferredTrainNumber, setPreferredTrainNumber] = useState(existing?.preferredTrainNumber ?? '');
  const [backupTrainNumbers, setBackupTrainNumbers] = useState<string[]>(existing?.backupTrainNumbers ?? []);
  const [passengerIds, setPassengerIds] = useState<string[]>(
    existing?.passengerIds ?? savedPassengers.slice(0, 1).map((p) => p.id),
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const candidateTrains = useMemo(
    () =>
      getTrains().filter(
        (tr) =>
          tr.sourceStationCode === sourceStationCode &&
          tr.destinationStationCode === destinationStationCode &&
          tr.supportedClasses.includes(preferredClass),
      ),
    [sourceStationCode, destinationStationCode, preferredClass],
  );

  function togglePassenger(id: string) {
    setPassengerIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function toggleBackup(trainNumber: string) {
    setBackupTrainNumbers((current) =>
      current.includes(trainNumber) ? current.filter((x) => x !== trainNumber) : [...current, trainNumber],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    if (!sourceStationCode || !destinationStationCode || sourceStationCode === destinationStationCode) {
      setError(t('search.errorSameStation'));
      return;
    }
    if (!preferredTrainNumber) {
      setError(t('tatkalPrepare.errorMissingPreferred'));
      return;
    }
    if (passengerIds.length === 0) {
      setError(t('tatkalPrepare.errorMissingPassengers'));
      return;
    }
    if (backupTrainNumbers.filter((n) => n !== preferredTrainNumber).length === 0) {
      setError(t('tatkalPrepare.errorMissingBackup'));
      return;
    }

    setError(undefined);
    prepareTatkal({
      userId: currentUser.id,
      sourceStationCode,
      destinationStationCode,
      journeyDate,
      preferredClass,
      preferredTrainNumber,
      backupTrainNumbers: backupTrainNumbers.filter((n) => n !== preferredTrainNumber),
      passengerIds,
    });
    navigate('/tatkal/countdown');
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900">{t('tatkalPrepare.title')}</h1>
      <p className="mt-2 text-gray-500">{t('tatkalPrepare.subtitle')}</p>

      {(prefillFrom || prefillTo) && !existing && (
        <p className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {t('tatkalPrepare.prefilledNotice')}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tatkal-from" className="block text-sm font-medium text-gray-700">
              {t('search.fromLabel')}
            </label>
            <select
              id="tatkal-from"
              value={sourceStationCode}
              onChange={(e) => {
                setSourceStationCode(e.target.value);
                setPreferredTrainNumber('');
                setBackupTrainNumbers([]);
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
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
            <label htmlFor="tatkal-to" className="block text-sm font-medium text-gray-700">
              {t('search.toLabel')}
            </label>
            <select
              id="tatkal-to"
              value={destinationStationCode}
              onChange={(e) => {
                setDestinationStationCode(e.target.value);
                setPreferredTrainNumber('');
                setBackupTrainNumbers([]);
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
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
            <label htmlFor="tatkal-date" className="block text-sm font-medium text-gray-700">
              {t('search.dateLabel')}
            </label>
            <input
              id="tatkal-date"
              type="date"
              value={journeyDate}
              min={DEMO_DATES.TODAY}
              onChange={(e) => setJourneyDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="tatkal-class" className="block text-sm font-medium text-gray-700">
              {t('search.classLabel')}
            </label>
            <select
              id="tatkal-class"
              value={preferredClass}
              onChange={(e) => {
                setPreferredClass(e.target.value as TravelClass);
                setPreferredTrainNumber('');
                setBackupTrainNumbers([]);
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            >
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700">{t('tatkalPrepare.passengersLabel')}</p>
          <ul className="mt-2 space-y-2">
            {savedPassengers.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
                  <input type="checkbox" checked={passengerIds.includes(p.id)} onChange={() => togglePassenger(p.id)} />
                  <span>
                    {p.name} · {p.age} · {p.gender}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="tatkal-preferred" className="block text-sm font-medium text-gray-700">
            {t('tatkalPrepare.preferredTrainLabel')}
          </label>
          <select
            id="tatkal-preferred"
            value={preferredTrainNumber}
            onChange={(e) => setPreferredTrainNumber(e.target.value)}
            disabled={candidateTrains.length === 0}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">—</option>
            {candidateTrains.map((tr) => (
              <option key={tr.number} value={tr.number}>
                {tr.name} · {tr.number}
              </option>
            ))}
          </select>
        </div>

        {preferredTrainNumber && (
          <div>
            <p className="block text-sm font-medium text-gray-700">{t('tatkalPrepare.backupTrainsLabel')}</p>
            <ul className="mt-2 space-y-2">
              {candidateTrains
                .filter((tr) => tr.number !== preferredTrainNumber)
                .map((tr) => (
                  <li key={tr.number}>
                    <label className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        checked={backupTrainNumbers.includes(tr.number)}
                        onChange={() => toggleBackup(tr.number)}
                      />
                      <span>
                        {tr.name} · {tr.number}
                      </span>
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('tatkalPrepare.markReadyAction')}
        </button>
      </form>
    </div>
  );
}
