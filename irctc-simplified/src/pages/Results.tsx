/**
 * Results — see spec/02-ux-spec.md's Results screen.
 * Reconstructs its SearchRequest entirely from the URL, computes the
 * search synchronously (via domain/smartSearch), and renders the
 * four categorized recommendations plus a secondary "more options"
 * list. Implements the Loading/Empty/Partial/Error states.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import {
  availabilityForOption,
  collapsedCategoriesFor,
  runSmartSearch,
  waitlistSavingsFor,
  type SmartSearchOutcome,
} from '../domain/smartSearch';
import { withSimulatedDelay } from '../utils/withSimulatedDelay';
import { buildTrainDetailsSearch, paramsToSearchRequest } from '../utils/searchRequestUrl';
import { TrainResultCard } from '../components/TrainResultCard';

const BOARDABLE_STATUSES = new Set(['CNF', 'RAC']);

type LoadState = 'loading' | 'error' | 'ready';

export function Results() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const request = paramsToSearchRequest(searchParams);

  const [state, setState] = useState<LoadState>('loading');
  const [outcome, setOutcome] = useState<SmartSearchOutcome | undefined>(undefined);
  const [showMore, setShowMore] = useState(false);

  const searchKey = searchParams.toString();

  useEffect(() => {
    if (!request) return;
    setState('loading');
    setShowMore(false);
    withSimulatedDelay(() => runSmartSearch(request))
      .then((o) => {
        setOutcome(o);
        setState('ready');
      })
      .catch(() => {
        setState('error');
      });
    // `request` is derived fresh from `searchKey` each render; keying
    // the effect on the raw query string avoids re-running due to a
    // new (but equal) object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  if (!request) {
    return (
      <div>
        <p className="text-gray-700">{t('results.invalidSearch')}</p>
        <Link to="/search" className="mt-3 inline-block text-blue-700 underline">
          {t('results.backToSearch')}
        </Link>
      </div>
    );
  }

  if (state === 'loading') {
    return <p className="text-gray-500">{t('results.loading')}</p>;
  }

  if (state === 'error') {
    return <p className="text-red-700">{t('common.errorGeneric')}</p>;
  }

  if (!outcome) return null;

  const { result, candidates } = outcome;
  const isEmpty = candidates.length === 0;
  const anyBoardable = candidates.some((c) => BOARDABLE_STATUSES.has(c.status));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('results.title')}</h1>
        <Link to={`/search?${searchKey}`} className="text-sm text-blue-700 underline">
          {t('results.backToSearch')}
        </Link>
      </div>

      {isEmpty && (
        <div className="rounded border border-gray-200 bg-white p-4 text-gray-700">
          <p className="font-medium">{t('results.emptyTitle')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('results.emptyBody')}</p>
        </div>
      )}

      {!isEmpty && !anyBoardable && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t('results.partialNotice')}
        </div>
      )}

      {!isEmpty && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {result.recommendations.map((option) => {
            const availability = availabilityForOption(candidates, option);
            if (!availability) return null;
            const alsoCategories = collapsedCategoriesFor(result.recommendations, option);
            const savings = option.category === 'CHEAPEST' ? waitlistSavingsFor(candidates, availability) : undefined;
            return (
              <TrainResultCard
                key={`${option.category}-${option.trainNumber}-${option.travelClass}`}
                availability={availability}
                category={option.category}
                alsoCategories={alsoCategories}
                waitlistSavings={savings}
                detailsLinkSearch={buildTrainDetailsSearch(searchParams, option.travelClass, option.category)}
              />
            );
          })}
        </div>
      )}

      {result.moreOptions.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-sm font-medium text-blue-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {showMore ? t('results.hideMoreOptions') : t('results.showMoreOptions')}
          </button>

          {showMore && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {result.moreOptions.map((availability) => (
                <TrainResultCard
                  key={`${availability.trainNumber}-${availability.travelClass}-${availability.quota}`}
                  availability={availability}
                  detailsLinkSearch={buildTrainDetailsSearch(searchParams, availability.travelClass)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
