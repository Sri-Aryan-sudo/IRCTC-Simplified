/**
 * Hindi lexicon — supplements (not replaces) the English lexicon.
 * See src/agent/lexicon/en.ts for the shape/rationale. The parser
 * always merges this with `en` (code-switching between English and
 * the selected language is common and expected), so this file only
 * needs the language-specific words.
 */

import type { lexicon as EnLexicon } from './en';

export const lexicon: typeof EnLexicon = {
  today: ['आज'],
  dayAfterTomorrow: ['परसों'],
  tomorrow: ['कल'],
  timePreferences: {
    MORNING: ['सुबह'],
    AFTERNOON: ['दोपहर'],
    EVENING: ['शाम'],
    NIGHT: ['रात'],
  },
  classHints: {
    '1A': ['फर्स्ट क्लास'],
    '2A': ['सेकंड एसी'],
    '3A': ['थर्ड एसी', 'एसी'],
    SL: ['स्लीपर'],
    CC: ['चेयर कार'],
  },
  confirmationMust: ['कन्फर्म ही चाहिए', 'सिर्फ कन्फर्म'],
  confirmationPrefer: ['कन्फर्म चाहिए', 'कन्फर्म'],
  priceCheapest: ['सबसे सस्ता', 'सस्ता'],
  speedFastest: ['सबसे तेज़', 'जल्दी'],
  tatkalIntent: ['तत्काल'],
  explainIntent: ['समझाइए', 'मतलब क्या है', 'क्या मतलब'],
  fromPrefixes: ['से '],
  toPrefixes: ['जाना है ', 'तक '],
  numberWords: {
    एक: 1,
    दो: 2,
    तीन: 3,
    चार: 4,
    पांच: 5,
  },
};
