/**
 * Merges a language-specific lexicon with the English one. English
 * words are always included alongside the selected language's words
 * — code-switching between English and Hindi/Telugu in the same
 * sentence is common in India, and station names are already
 * language-independent (spec/03-agent-spec.md §22), so this keeps
 * keyword matching robust without a "wrong language" failure mode.
 */

import { lexicon as en } from './en';
import { lexicon as hi } from './hi';
import { lexicon as te } from './te';
import type { SupportedLanguage } from '../../i18n';

type Lexicon = typeof en;

function mergeArrayRecord<K extends string>(
  a: Record<K, string[]>,
  b: Record<K, string[]>,
): Record<K, string[]> {
  const result = {} as Record<K, string[]>;
  for (const key of Object.keys(a) as K[]) {
    result[key] = [...a[key], ...(b[key] ?? [])];
  }
  return result;
}

function merge(a: Lexicon, b: Lexicon): Lexicon {
  return {
    today: [...a.today, ...b.today],
    dayAfterTomorrow: [...a.dayAfterTomorrow, ...b.dayAfterTomorrow],
    tomorrow: [...a.tomorrow, ...b.tomorrow],
    timePreferences: mergeArrayRecord(a.timePreferences, b.timePreferences),
    classHints: mergeArrayRecord(a.classHints, b.classHints),
    confirmationMust: [...a.confirmationMust, ...b.confirmationMust],
    confirmationPrefer: [...a.confirmationPrefer, ...b.confirmationPrefer],
    priceCheapest: [...a.priceCheapest, ...b.priceCheapest],
    speedFastest: [...a.speedFastest, ...b.speedFastest],
    tatkalIntent: [...a.tatkalIntent, ...b.tatkalIntent],
    explainIntent: [...a.explainIntent, ...b.explainIntent],
    fromPrefixes: [...a.fromPrefixes, ...b.fromPrefixes],
    toPrefixes: [...a.toPrefixes, ...b.toPrefixes],
    numberWords: { ...a.numberWords, ...b.numberWords },
  };
}

const byLanguage: Record<SupportedLanguage, Lexicon> = {
  en,
  hi: merge(en, hi),
  te: merge(en, te),
};

export function getLexicon(lang: SupportedLanguage): Lexicon {
  return byLanguage[lang];
}
