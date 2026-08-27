/**
 * Train Details — see spec/02-ux-spec.md's Train Details screen.
 * Fully identified by the URL (trainNumber path param + date/class
 * query params), so a refresh works. Re-checks availability fresh
 * (tools/getAvailability) rather than trusting whatever Results
 * computed a moment earlier — per that screen's edge case about
 * surfacing a status change honestly. Reuses the same
 * SearchResult/availability shapes throughout; no second data model.
 */

import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { getTrain } from '../services/trains';
import { getAvailability } from '../tools/getAvailability';
import { StatusBadge } from '../components/StatusBadge';
import { formatDuration, formatFare } from '../utils/format';
import { paramsToSearchRequest, buildPassengerReviewSearch } from '../utils/searchRequestUrl';
import type { RecommendationCategory } from '../types/domain';

const REASON_KEY: Record<RecommendationCategory, 'results.reasonBestOverall' | 'results.reasonFastest' | 'results.reasonCheapest' | 'results.reasonBestConfirmation'> = {
  BEST_OVERALL: 'results.reasonBestOverall',
  FASTEST: 'results.reasonFastest',
  CHEAPEST: 'results.reasonCheapest',
  BEST_CONFIRMATION_CHANCE: 'results.reasonBestConfirmation',
};

const CATEGORY_LABEL_KEY: Record<RecommendationCategory, 'results.categoryBestOverall' | 'results.categoryFastest' | 'results.categoryCheapest' | 'results.categoryBestConfirmation'> = {
  BEST_OVERALL: 'results.categoryBestOverall',
  FASTEST: 'results.categoryFastest',
  CHEAPEST: 'results.categoryCheapest',
  BEST_CONFIRMATION_CHANCE: 'results.categoryBestConfirmation',
};

export function TrainDetails() {
  const { t } = useLanguage();
  const { trainNumber } = useParams<{ trainNumber: string }>();
  const [searchParams] = useSearchParams();

  const journeyDate = searchParams.get('date');
  const travelClass = searchParams.get('class');
  const category = searchParams.get('category') as RecommendationCategory | null;
  const request = paramsToSearchRequest(searchParams);

  const train = trainNumber ? getTrain(trainNumber) : undefined;
  const availability =
    trainNumber && journeyDate && travelClass
      ? getAvailability(trainNumber, journeyDate, travelClass as never, 'GENERAL')
      : undefined;

  const backToResultsHref = `/results?${searchParams.toString()}`;

  if (!train || !availability) {
    return (
      <div>
        <p className="text-gray-700">{t('trainDetails.notFound')}</p>
        <Link to={request ? backToResultsHref : '/search'} className="mt-3 inline-block text-blue-700 underline">
          {t('results.backToSearch')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link to={backToResultsHref} className="text-sm text-blue-700 underline">
        {t('trainDetails.backToResults')}
      </Link>

      {category && (
        <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <span className="font-semibold">{t(CATEGORY_LABEL_KEY[category])}:</span> {t(REASON_KEY[category])}
        </div>
      )}

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{train.name}</h1>
      <p className="text-gray-500">
        {train.number} · {availability.travelClass}
      </p>

      <dl className="mt-6 space-y-3 rounded border border-gray-200 bg-white p-4">
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.departureLabel')}</dt>
          <dd className="font-medium text-gray-900">{train.departureTime}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.arrivalLabel')}</dt>
          <dd className="font-medium text-gray-900">
            {train.arrivalTime}
            {train.arrivalDayOffset > 0 ? ` (+${train.arrivalDayOffset}d)` : ''}
          </dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.durationLabel')}</dt>
          <dd className="font-medium text-gray-900">{formatDuration(train.durationMinutes)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.classLabel')}</dt>
          <dd className="font-medium text-gray-900">{availability.travelClass}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.fareLabel')}</dt>
          <dd className="font-medium text-gray-900">{formatFare(availability.fareAmount)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">{t('trainDetails.statusLabel')}</dt>
          <dd>
            <StatusBadge availability={availability} />
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <Link
          to={`/checkout/passengers${buildPassengerReviewSearch(searchParams, train.number)}`}
          className="inline-block rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('trainDetails.proceedAction')}
        </Link>
      </div>
    </div>
  );
}
