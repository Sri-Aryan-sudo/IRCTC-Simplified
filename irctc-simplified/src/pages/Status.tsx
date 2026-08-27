/**
 * Understand My Status — see spec/02-ux-spec.md's Understand My
 * Status screen. A standalone Status Translator: pick a code (and
 * position, if applicable) and get the plain-language explanation
 * via tools/explainStatus. Supports deep-linking via `?code=&position=`
 * (from StatusBadge elsewhere in the app) so a status shown on
 * Results/Train Details arrives here pre-populated, not re-entered.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { explainStatus, type ExplainStatusResult } from '../tools/explainStatus';
import { getStatusDefinitions } from '../services/statusDefinitions';
import type { StatusCode } from '../types/domain';
import type { TranslationKey } from '../i18n';

const CODES: StatusCode[] = ['CNF', 'RAC', 'GNWL', 'PQWL', 'RLWL', 'TQWL', 'WL', 'SOLD_OUT', 'CAN', 'REGRET'];

function isStatusCode(value: string | null): value is StatusCode {
  return !!value && (CODES as string[]).includes(value);
}

export function Status() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const definitions = getStatusDefinitions();

  const initialCodeParam = searchParams.get('code');
  const initialCode = isStatusCode(initialCodeParam) ? initialCodeParam : undefined;
  const initialPositionParam = searchParams.get('position');

  const [selectedCode, setSelectedCode] = useState<StatusCode | ''>(initialCode ?? '');
  const [position, setPosition] = useState<string>(initialPositionParam ?? '');
  const [result, setResult] = useState<ExplainStatusResult | undefined>(() =>
    initialCode ? explainStatus(initialCode, initialPositionParam ? Number(initialPositionParam) : undefined) : undefined,
  );
  const [submitted, setSubmitted] = useState(Boolean(initialCode));

  const definition = selectedCode ? definitions.find((d) => d.code === selectedCode) : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!selectedCode) {
      setResult(undefined);
      return;
    }
    const positionNum = position.trim() ? Number(position.trim()) : undefined;
    setResult(explainStatus(selectedCode, positionNum));
  }

  function explanationFor(code: StatusCode, positionNum?: number): string {
    return t(`status.${code}.explanation` as TranslationKey, { position: positionNum ?? '' });
  }

  function suggestionFor(code: StatusCode, positionNum?: number): string | undefined {
    if (!definitions.find((d) => d.code === code)?.suggestedConsideration) return undefined;
    return t(`status.${code}.suggestion` as TranslationKey, { position: positionNum ?? '' });
  }

  const resultPosition = position.trim() ? Number(position.trim()) : undefined;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900">{t('statusTranslator.title')}</h1>
      <p className="mt-2 text-gray-500">{t('statusTranslator.subtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="status-code">
            {t('statusTranslator.codeLabel')}
          </label>
          <select
            id="status-code"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value as StatusCode | '')}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <option value="">—</option>
            {CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {definition?.positionApplicable && (
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="status-position">
              {t('statusTranslator.positionLabel')}
            </label>
            <input
              id="status-position"
              type="number"
              min={1}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t('statusTranslator.positionPlaceholder')}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            />
          </div>
        )}

        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {t('statusTranslator.submit')}
        </button>
      </form>

      {submitted &&
        (result ? (
          <div className="mt-6 rounded border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-900">
              <span className="font-mono">{result.definition.code}</span> · {result.definition.displayLabel}
            </p>
            <p className="mt-2 text-sm text-blue-900">{explanationFor(result.definition.code, resultPosition)}</p>
            {result.definition.suggestedConsideration && (
              <p className="mt-2 text-sm text-blue-800">
                <span className="font-medium">{t('statusTranslator.considerationLabel')}:</span>{' '}
                {suggestionFor(result.definition.code, resultPosition)}
              </p>
            )}
          </div>
        ) : (
          <p role="alert" className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('statusTranslator.unrecognized')}
          </p>
        ))}
    </div>
  );
}
