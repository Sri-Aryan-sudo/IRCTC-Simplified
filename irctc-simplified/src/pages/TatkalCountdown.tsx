/**
 * Countdown — see spec/02-ux-spec.md's Countdown screen. Runs a
 * short, fully deterministic on-screen timer (spec/05-technical-spec.md
 * §15: "a fixed few seconds... independent of the real gap between
 * 'now' and tatkalOpensAt") and auto-advances to Booking Attempt when
 * it reaches zero — no user action required, matching real Tatkal
 * urgency where the app races the clock, not the user.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getTatkalPreparation } from '../services/tatkal';
import { getTrain } from '../services/trains';

const COUNTDOWN_SECONDS = 5;

export function TatkalCountdown() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const preparation = currentUser ? getTatkalPreparation(currentUser.id) : undefined;

  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!preparation?.isReady) return;
    if (secondsLeft <= 0) {
      navigate('/tatkal/attempt', { replace: true });
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, preparation?.isReady, navigate]);

  if (!preparation || !preparation.isReady) {
    return (
      <div>
        <p className="text-gray-700">{t('tatkalCountdown.noPreparation')}</p>
        <Link to="/tatkal" className="mt-3 inline-block text-blue-700 underline">
          {t('tatkal.title')}
        </Link>
      </div>
    );
  }

  const preferredTrain = getTrain(preparation.preferredTrainNumber);

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-xl font-semibold text-gray-900">{t('tatkalCountdown.title')}</h1>
      <p className="mt-2 text-gray-500">{t('tatkalCountdown.subtitle')}</p>

      <div className="mt-8 text-6xl font-bold text-gray-900" role="status" aria-live="polite">
        {secondsLeft}
      </div>

      <div className="mt-8 rounded border border-gray-200 bg-white p-4 text-left">
        <p className="text-sm text-gray-500">{t('tatkalCountdown.preparedSummaryLabel')}</p>
        <p className="mt-1 font-medium text-gray-900">
          {preferredTrain?.name} · {preparation.preferredClass}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {t('tatkal.backupCountLabel', { count: preparation.backupTrainNumbers.length })}
        </p>
      </div>

      <Link to="/tatkal" className="mt-6 inline-block text-sm text-gray-500 underline">
        {t('tatkalCountdown.abandonAction')}
      </Link>
    </div>
  );
}
