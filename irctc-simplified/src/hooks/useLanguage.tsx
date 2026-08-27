/**
 * Language state — see spec/05-technical-spec.md §6, §7 and
 * spec/02-ux-spec.md's Cross-cutting Language Selection.
 *
 * - Default: English.
 * - Persists in sessionStorage (session-scoped, not domain data —
 *   matches the reasoning in spec/04-data-spec.md's UserPreferences
 *   note on why language isn't a persisted data-layer field).
 * - Switching language is a pure state update: no reload, and — since
 *   this context is entirely separate from auth/booking/agent/Tatkal
 *   state — it can never reset any of that domain state as a side
 *   effect.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LANGUAGE, translate, type SupportedLanguage, type TranslationKey } from '../i18n';
import { readJSON, writeJSON } from '../utils/storage';

const LANGUAGE_STORAGE_KEY = 'irctc-simplified:language';

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readPersistedLanguage(): SupportedLanguage {
  return readJSON<SupportedLanguage>('session', LANGUAGE_STORAGE_KEY) ?? DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(readPersistedLanguage);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    writeJSON('session', LANGUAGE_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(key, language, vars),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
