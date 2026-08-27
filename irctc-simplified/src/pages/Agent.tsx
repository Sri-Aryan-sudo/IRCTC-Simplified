/**
 * Agent — see spec/02-ux-spec.md's Agent/Recommendation/Approval
 * screens and spec/05-technical-spec.md §4/§9. One route rendering a
 * different view per `AgentSession.status` (COLLECTING/
 * NEEDS_CLARIFICATION → RECOMMENDED → AWAITING_APPROVAL →
 * BOOKED/DECLINED), per the locked state machine
 * (spec/03-agent-spec.md §9). Session state is deliberately
 * in-memory only (`useState`), not persisted — an interrupted
 * conversation restarting is an accepted simplification
 * (spec/05-technical-spec.md §6).
 *
 * Status-explanation requests ("Explain GNWL 24") are handled
 * separately, without ever creating an AgentSession — they don't
 * need the booking state machine (spec/03-agent-spec.md §9's
 * EXPLAINING_STATUS track).
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import * as engine from '../agent/engine';
import { classifyRequestKind, parseIntent, parseStatusQuery } from '../agent/intentParser';
import { explainStatus, type ExplainStatusResult } from '../tools/explainStatus';
import { getAvailability } from '../tools/getAvailability';
import { getTrain } from '../services/trains';
import { formatFare } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';
import type { AgentSession, RecommendationOption } from '../types/domain';
import type { TranslationKey } from '../i18n';

const REASON_KEY: Record<RecommendationOption['category'], TranslationKey> = {
  BEST_OVERALL: 'results.reasonBestOverall',
  FASTEST: 'results.reasonFastest',
  CHEAPEST: 'results.reasonCheapest',
  BEST_CONFIRMATION_CHANCE: 'results.reasonBestConfirmation',
};

const CATEGORY_KEY: Record<RecommendationOption['category'], TranslationKey> = {
  BEST_OVERALL: 'results.categoryBestOverall',
  FASTEST: 'results.categoryFastest',
  CHEAPEST: 'results.categoryCheapest',
  BEST_CONFIRMATION_CHANCE: 'results.categoryBestConfirmation',
};

const EXAMPLE_KEYS: TranslationKey[] = [
  'agent.exampleBook',
  'agent.exampleCheapest',
  'agent.exampleFastest',
  'agent.exampleConfirmation',
  'agent.exampleTatkal',
];

function OptionCard({ option }: { option: RecommendationOption }) {
  const { t } = useLanguage();
  const train = getTrain(option.trainNumber);
  const availability = getAvailability(option.trainNumber, option.journeyDate, option.travelClass, 'GENERAL');
  if (!train || !availability) return null;

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t(CATEGORY_KEY[option.category])}</p>
      <p className="mt-1 font-medium text-gray-900">
        {train.name} · {train.number} · {option.travelClass}
      </p>
      <p className="mt-1 text-sm text-gray-600">{formatFare(availability.fareAmount)}</p>
      <div className="mt-2">
        <StatusBadge availability={availability} />
      </div>
      <p className="mt-2 text-sm text-gray-500">{t(REASON_KEY[option.category])}</p>
      {option.tradeOffNote && <p className="mt-1 text-xs text-amber-700">{option.tradeOffNote}</p>}
    </div>
  );
}

export function Agent() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<AgentSession | undefined>(undefined);
  const [statusResult, setStatusResult] = useState<ExplainStatusResult | undefined>(undefined);
  const [inputText, setInputText] = useState('');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<RecommendationOption[]>([]);
  const [approveError, setApproveError] = useState<'NOT_ENOUGH_PASSENGERS' | 'BOOKING_FAILED' | undefined>(undefined);

  if (!currentUser) return null;

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setStatusResult(undefined);
    setApproveError(undefined);

    const kind = classifyRequestKind(text, language);
    if (kind === 'STATUS') {
      const query = parseStatusQuery(text);
      const result = query ? explainStatus(query.code, query.position) : undefined;
      if (result) {
        setStatusResult(result);
        return;
      }
    }

    // Tatkal-intent requests hand off to Tatkal Mode's own
    // Preparation screen (spec/03-agent-spec.md §9/§12) with whatever
    // journey details were extracted already filled in — preferred/
    // backup train selection still needs the user's explicit choice
    // there, so the agent doesn't fabricate a TatkalPreparation itself.
    if (kind === 'TATKAL') {
      const tatkalIntent = parseIntent(text, language);
      const params = new URLSearchParams();
      if (tatkalIntent.sourceStationCode) params.set('from', tatkalIntent.sourceStationCode);
      if (tatkalIntent.destinationStationCode) params.set('to', tatkalIntent.destinationStationCode);
      if (tatkalIntent.resolvedDate) params.set('date', tatkalIntent.resolvedDate);
      if (tatkalIntent.preferredClass) params.set('class', tatkalIntent.preferredClass);
      navigate(`/tatkal/prepare?${params.toString()}`);
      return;
    }

    const base = session ?? engine.createSession(currentUser!.id);
    const next = engine.submitMessage(base, text, language);
    setSession(next);
    setShowAlternatives(false);
  }

  function handleToggleAlternatives() {
    if (!session) return;
    if (!showAlternatives) setAlternatives(engine.requestAlternatives(session));
    setShowAlternatives((v) => !v);
  }

  function handleSelectAlternative(option: RecommendationOption) {
    if (!session) return;
    setSession(engine.selectRecommendation(session, option));
    setShowAlternatives(false);
  }

  function handleConfirm() {
    if (!session) return;
    const result = engine.approve(session);
    setSession(result.session);
    setApproveError(result.error);
  }

  function handleStartOver() {
    setSession(undefined);
    setStatusResult(undefined);
    setShowAlternatives(false);
    setApproveError(undefined);
  }

  const recommendationTrain = session?.recommendation ? getTrain(session.recommendation.trainNumber) : undefined;
  const recommendationAvailability = session?.recommendation
    ? getAvailability(
        session.recommendation.trainNumber,
        session.recommendation.journeyDate,
        session.recommendation.travelClass,
        'GENERAL',
      )
    : undefined;
  const passengerCount = session?.intent.passengerCount ?? 1;
  const totalFare = recommendationAvailability ? recommendationAvailability.fareAmount * passengerCount : 0;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900">{t('agent.title')}</h1>
      <p className="mt-2 text-gray-500">{t('agent.subtitle')}</p>

      <div className="mt-4 rounded border border-blue-100 bg-blue-50 p-3">
        <p className="text-sm font-medium text-blue-950">{t('agent.examplesTitle')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_KEYS.map((key) => (
            <button key={key} type="button" onClick={() => setInputText(t(key))}
              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-blue-800 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {statusResult && (
        <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-900">{statusResult.definition.displayLabel}</p>
          <p className="mt-1 text-sm text-blue-900">{statusResult.interpolatedExplanation}</p>
          {statusResult.interpolatedConsideration && (
            <p className="mt-2 text-sm text-blue-800">{statusResult.interpolatedConsideration}</p>
          )}
        </div>
      )}

      {(!session || session.status === 'COLLECTING' || session.status === 'NEEDS_CLARIFICATION') && (
        <>
          {session?.status === 'NEEDS_CLARIFICATION' && session.clarificationPrompt && (
            <p role="status" className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {session.clarificationPrompt}
            </p>
          )}
          <form onSubmit={handleSend} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('agent.inputPlaceholder')}
              className="flex-1 rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            />
            <button
              type="submit"
              className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {t('agent.sendAction')}
            </button>
          </form>
        </>
      )}

      {session?.status === 'RECOMMENDED' &&
        (session.recommendation ? (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('agent.recommendationTitle')}</h2>
            <div className="mt-2">
              <OptionCard option={session.recommendation} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSession(engine.requestApproval(session))}
                className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {t('agent.bookAction')}
              </button>
              <button
                type="button"
                onClick={handleToggleAlternatives}
                className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {showAlternatives ? t('agent.hideAlternatives') : t('agent.showAlternatives')}
              </button>
            </div>

            {showAlternatives && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900">{t('agent.alternativesTitle')}</h3>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {alternatives
                    .filter(
                      (opt) =>
                        opt.trainNumber !== session.recommendation!.trainNumber ||
                        opt.travelClass !== session.recommendation!.travelClass,
                    )
                    .map((opt) => (
                      <div key={`${opt.category}-${opt.trainNumber}-${opt.travelClass}`}>
                        <OptionCard option={opt} />
                        <button
                          type="button"
                          onClick={() => handleSelectAlternative(opt)}
                          className="mt-2 text-sm font-medium text-blue-700 underline"
                        >
                          {t('agent.selectAlternative')}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded border border-gray-200 bg-white p-4">
            <p className="font-medium text-gray-900">{t('agent.noResultsTitle')}</p>
            <p className="mt-1 text-sm text-gray-500">{t('agent.noResultsBody')}</p>
            <button
              type="button"
              onClick={handleStartOver}
              className="mt-3 rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {t('agent.startOverAction')}
            </button>
          </div>
        ))}

      {session?.status === 'AWAITING_APPROVAL' && session.recommendation && (
        <div className="mt-6 rounded border border-blue-200 bg-blue-50 p-4">
          <p className="font-medium text-blue-900">{t('agent.approvalTitle')}</p>
          <p className="mt-1 text-sm text-blue-900">
            {t('agent.approvalBody', {
              train: recommendationTrain?.name ?? '',
              count: passengerCount,
              fare: formatFare(totalFare),
            })}
          </p>

          {approveError === 'NOT_ENOUGH_PASSENGERS' && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {t('agent.notEnoughPassengers')}
            </p>
          )}
          {approveError === 'BOOKING_FAILED' && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {t('agent.bookingFailedTitle')} {t('agent.bookingFailedBody')}
            </p>
          )}

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {t('agent.confirmBookingAction')}
            </button>
            <button
              type="button"
              onClick={() => setSession(engine.decline(session))}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {t('agent.goBackAction')}
            </button>
          </div>
        </div>
      )}

      {session?.status === 'DECLINED' && (
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-900">{t('agent.declinedTitle')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('agent.declinedBody')}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSession(engine.backToRecommendation(session))}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {t('agent.backToRecommendationAction')}
            </button>
            <button type="button" onClick={handleStartOver} className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
              {t('agent.startOverAction')}
            </button>
          </div>
        </div>
      )}

      {session?.status === 'BOOKED' && session.bookingId && (
        <div className="mt-6 rounded border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-900">{t('bookingSuccess.title')}</p>
          <p className="mt-1 text-sm text-green-800">{t('agent.mockNotice')}</p>
          <Link to={`/booking/success/${session.bookingId}`} className="mt-3 inline-block text-blue-700 underline">
            {t('agent.viewBookingAction')}
          </Link>
        </div>
      )}
    </div>
  );
}
