/**
 * i18n entry point. See spec/05-technical-spec.md §7.
 *
 * - Exactly three supported languages: en, hi, te.
 * - `translate()` always returns a real string — falls back to
 *   English for a missing key, and as a last-resort defensive
 *   fallback returns the key itself rather than `undefined` (this
 *   branch should be unreachable in practice, since every
 *   `TranslationKey` is guaranteed present in `en`).
 * - No external i18n dependency (spec/05-technical-spec.md §22).
 */

import { en, type TranslationKey } from './en';
import { hi } from './hi';
import { te } from './te';

export type { TranslationKey };
export type SupportedLanguage = 'en' | 'hi' | 'te';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  code: SupportedLanguage;
  /** Native display name — used in the language selector, per spec/02-ux-spec.md. */
  nativeName: string;
}> = [
  { code: 'en', nativeName: 'English' },
  { code: 'hi', nativeName: 'हिन्दी' },
  { code: 'te', nativeName: 'తెలుగు' },
];

const dictionaries: Record<SupportedLanguage, Partial<Record<TranslationKey, string>>> = {
  en,
  hi,
  te,
};

/** Simple `{varName}` interpolation — needed for RailwayStatusDefinition's `{position}` placeholder later. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let result = template;
  for (const [name, value] of Object.entries(vars)) {
    result = result.split(`{${name}}`).join(String(value));
  }
  return result;
}

/**
 * Translate a key into the given language, with an English fallback
 * for any key missing from that language's dictionary. Never returns
 * `undefined` or a blank string.
 */
export function translate(
  key: TranslationKey,
  lang: SupportedLanguage,
  vars?: Record<string, string | number>,
): string {
  const value = dictionaries[lang][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  return interpolate(value, vars);
}
