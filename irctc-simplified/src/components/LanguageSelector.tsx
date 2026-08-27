/**
 * The language selector — see spec/02-ux-spec.md's Cross-cutting
 * Language Selection and spec/05-technical-spec.md §7, §21.
 *
 * Selecting a language is not a navigation event: it's a same-screen
 * re-render of presentation text only (handled entirely by
 * useLanguage/LanguageProvider) — no domain state is touched.
 */

import { useLanguage } from '../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../i18n';

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className="inline-flex items-center gap-1 text-sm text-gray-700">
      <span className="sr-only">{t('common.language')}</span>
      <span aria-hidden="true">🌐</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
        aria-label={t('common.language')}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        {SUPPORTED_LANGUAGES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
