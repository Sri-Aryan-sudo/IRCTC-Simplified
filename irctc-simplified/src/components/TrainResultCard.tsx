/**
 * One train option card — used for both the four categorized
 * recommendations and the secondary "more options" list on Results.
 * See spec/02-ux-spec.md's Results screen ("Each card shows: price,
 * plain-language status..., duration, and a short reason").
 */

import { Link } from 'react-router-dom';
import { getTrain } from '../services/trains';
import { useLanguage } from '../hooks/useLanguage';
import { formatDuration, formatFare } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import type { RecommendationCategory, TrainAvailability } from '../types/domain';

const CATEGORY_LABEL_KEY: Record<RecommendationCategory, 'results.categoryBestOverall' | 'results.categoryFastest' | 'results.categoryCheapest' | 'results.categoryBestConfirmation'> = {
  BEST_OVERALL: 'results.categoryBestOverall',
  FASTEST: 'results.categoryFastest',
  CHEAPEST: 'results.categoryCheapest',
  BEST_CONFIRMATION_CHANCE: 'results.categoryBestConfirmation',
};

const REASON_KEY: Record<RecommendationCategory, 'results.reasonBestOverall' | 'results.reasonFastest' | 'results.reasonCheapest' | 'results.reasonBestConfirmation'> = {
  BEST_OVERALL: 'results.reasonBestOverall',
  FASTEST: 'results.reasonFastest',
  CHEAPEST: 'results.reasonCheapest',
  BEST_CONFIRMATION_CHANCE: 'results.reasonBestConfirmation',
};

export interface TrainResultCardProps {
  availability: TrainAvailability;
  category?: RecommendationCategory;
  /** Other categories that collapsed onto this exact same option — spec/02-ux-spec.md's collapse edge case. */
  alsoCategories?: RecommendationCategory[];
  /** Set only for a non-boardable Cheapest pick where a confirmed alternative exists — the actual ₹ difference. */
  waitlistSavings?: number;
  detailsLinkSearch: string;
}

export function TrainResultCard({
  availability,
  category,
  alsoCategories,
  waitlistSavings,
  detailsLinkSearch,
}: TrainResultCardProps) {
  const { t } = useLanguage();
  const train = getTrain(availability.trainNumber);

  if (!train) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {category && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
          {t(CATEGORY_LABEL_KEY[category])}
          {alsoCategories && alsoCategories.length > 0 && (
            <span className="ml-2 font-normal normal-case text-gray-500">
              ({t('results.alsoLabel')} {alsoCategories.map((c) => t(CATEGORY_LABEL_KEY[c])).join(', ')})
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="font-semibold text-gray-900">{train.name}</div>
          <div className="text-sm text-gray-500">
            {train.number} · {availability.travelClass}
          </div>
        </div>
        <div className="text-lg font-semibold text-gray-900">{formatFare(availability.fareAmount)}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
        <span>
          {train.departureTime} → {train.arrivalTime}
          {train.arrivalDayOffset > 0 ? ` (+${train.arrivalDayOffset}d)` : ''}
        </span>
        <span>{formatDuration(train.durationMinutes)}</span>
        <StatusBadge availability={availability} />
      </div>

      {category && (
        <p className="mt-2 text-sm text-gray-600">
          {t(REASON_KEY[category])}
          {waitlistSavings !== undefined && waitlistSavings > 0 && (
            <span className="block text-amber-700">
              {t('results.tradeoffWaitlistNotice', { savings: formatFare(waitlistSavings) })}
            </span>
          )}
        </p>
      )}

      <div className="mt-3">
        <Link
          to={`/train/${availability.trainNumber}${detailsLinkSearch}`}
          className="inline-block rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('results.selectAction')}
        </Link>
      </div>
    </div>
  );
}
